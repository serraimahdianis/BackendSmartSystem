import { Injectable, NotFoundException, forwardRef, Inject, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Attendance, AttendanceDocument } from './schemas/attendance.schema';
import { Student, StudentDocument } from '../student/schemas/student.schema';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { EventsGateway } from '../events/events.gateway';
import { NonceService } from '../nonce/nonce.service';
import { AntiFraudService } from '../anti-fraud/anti-fraud.service';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(Attendance.name)
    private attendanceModel: Model<AttendanceDocument>,
    @InjectModel(Student.name)
    private studentModel: Model<StudentDocument>,
    @Inject(forwardRef(() => EventsGateway))
    private eventsGateway: EventsGateway,
    private nonceService: NonceService,
    private antiFraudService: AntiFraudService,
  ) {}

  async recordScan(
    createAttendanceDto: CreateAttendanceDto,
    req?: { ip?: string },
  ): Promise<Attendance> {
    if (createAttendanceDto.nonce) {
      const valid = this.nonceService.verify(
        createAttendanceDto.nonce,
        createAttendanceDto.sessionId,
      );
      if (!valid) {
        throw new BadRequestException('Invalid or expired QR code. Please scan again.');
      }
    }

    if (!createAttendanceDto.scanTime) {
      createAttendanceDto.scanTime = new Date().toISOString();
    }

    const scanDate = new Date(createAttendanceDto.scanTime);
    const sessionIdOid = new Types.ObjectId(createAttendanceDto.sessionId);
    const studentIdOid = new Types.ObjectId(createAttendanceDto.studentId);

    const fraudCheck = await this.antiFraudService.checkAndRecord({
      sessionId: createAttendanceDto.sessionId,
      studentId: createAttendanceDto.studentId,
      scanTime: scanDate,
      method: (createAttendanceDto.method as 'RFID' | 'QR' | 'MANUAL') || 'RFID',
      deviceId: createAttendanceDto.deviceId,
      ipAddress: createAttendanceDto.ipAddress || req?.ip,
    });

    const existing = await this.attendanceModel
      .findOne({ sessionId: sessionIdOid, studentId: studentIdOid })
      .exec();

    if (existing) {
      if (fraudCheck.rejected) {
        return existing;
      }
      const oldStatus = existing.status;
      existing.status = createAttendanceDto.status;
      existing.scanTime = scanDate;
      existing.riskScore = (existing.riskScore || 0) + fraudCheck.riskScore;
      if (fraudCheck.fraudEvent?.riskScore) {
        existing.fraudFlags = [...new Set([...(existing.fraudFlags || []), fraudCheck.fraudEvent.reasonCode])];
      }
      const saved = await existing.save();

      const student = await this.studentModel.findById(studentIdOid).select('fullName').exec();
      this.eventsGateway.emitAttendanceStatusChanged({
        sessionId: createAttendanceDto.sessionId,
        studentId: createAttendanceDto.studentId,
        oldStatus,
        newStatus: saved.status,
      });

      return saved;
    }

    if (fraudCheck.rejected) {
      throw new BadRequestException(
        fraudCheck.description || 'Scan rejected by fraud detection',
      );
    }

    const record = new this.attendanceModel({
      sessionId: sessionIdOid,
      studentId: studentIdOid,
      status: createAttendanceDto.status,
      scanTime: scanDate,
      method: createAttendanceDto.method || 'RFID',
      deviceId: createAttendanceDto.deviceId,
      ipAddress: createAttendanceDto.ipAddress || req?.ip,
      riskScore: fraudCheck.riskScore,
      fraudFlags: fraudCheck.fraudEvent ? [fraudCheck.fraudEvent.reasonCode] : [],
    });
    const saved = await record.save();

    const student = await this.studentModel.findById(studentIdOid).select('fullName').exec();
    this.eventsGateway.emitAttendanceScan({
      sessionId: createAttendanceDto.sessionId,
      studentId: createAttendanceDto.studentId,
      studentName: student?.fullName || 'Unknown',
      status: saved.status,
      scanTime: saved.scanTime.toISOString(),
    });

    return saved;
  }

  async findBySession(sessionId: string, page: number = 1, limit: number = 20): Promise<PaginatedResult<Attendance>> {
    const filter = { sessionId: new Types.ObjectId(sessionId) };
    const total = await this.attendanceModel.countDocuments(filter).exec();
    const data = await this.attendanceModel
      .find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('studentId', 'fullName studentId group')
      .sort({ scanTime: -1 })
      .exec();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findByStudent(studentId: string, page: number = 1, limit: number = 20): Promise<PaginatedResult<Attendance>> {
    const filter = { studentId: new Types.ObjectId(studentId) };
    const total = await this.attendanceModel.countDocuments(filter).exec();
    const data = await this.attendanceModel
      .find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('sessionId')
      .sort({ scanTime: -1 })
      .exec();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string): Promise<Attendance> {
    const record = await this.attendanceModel
      .findById(new Types.ObjectId(id))
      .populate('studentId', 'fullName studentId group')
      .populate('sessionId')
      .exec();
    if (!record) {
      throw new NotFoundException(
        'Attendance record with ID "' + id + '" not found',
      );
    }
    return record;
  }

  async getStats(studentId?: string): Promise<Record<string, any>> {
    const filter: Record<string, any> = {};
    if (studentId) {
      try {
        const studentOid = new Types.ObjectId(studentId);
        const studentExists = await this.studentModel.exists({
          _id: studentOid,
        });
        if (!studentExists) {
          throw new NotFoundException(
            'Student with ID "' + studentId + '" not found',
          );
        }
        filter.studentId = studentOid;
      } catch (e) {
        if (e instanceof NotFoundException) throw e;
        return {
          total: 0,
          totalPresent: 0,
          totalAbsent: 0,
          totalLate: 0,
          attendanceRate: 0,
          byStatus: [],
          bySession: [],
        };
      }
    }

    const total = await this.attendanceModel.countDocuments(filter);
    const byStatus = await this.attendanceModel.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const bySession = await this.attendanceModel.aggregate([
      { $match: filter },
      { $group: { _id: '$sessionId', count: { $sum: 1 } } },
    ]);

    const statsMap = byStatus.reduce(
      (acc: Record<string, number>, item: any) => {
        acc[item._id] = item.count;
        return acc;
      },
      {} as Record<string, number>,
    );

    const totalPresent = statsMap['present'] || 0;
    const totalAbsent = statsMap['absent'] || 0;
    const totalLate = statsMap['late'] || 0;
    const attendanceRate = total > 0 ? ((totalPresent + totalLate) / total) * 100 : 0;

    const moduleStats = await this.attendanceModel.aggregate([
      { $match: filter },
      { $lookup: { from: 'sessions', localField: 'sessionId', foreignField: '_id', as: 'session' } },
      { $unwind: '$session' },
      { $lookup: { from: 'modules', localField: 'session.moduleId', foreignField: '_id', as: 'module' } },
      { $unwind: '$module' },
      {
        $group: {
          _id: '$module._id',
          moduleName: { $first: '$module.name' },
          present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
          total: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          moduleId: '$_id',
          moduleName: 1,
          present: 1,
          absent: 1,
          late: 1,
          total: 1,
          attendanceRate: { $multiply: [{ $divide: [{ $add: ['$present', '$late'] }, '$total'] }, 100] },
        },
      },
    ]);

    return {
      total,
      totalPresent,
      totalAbsent,
      totalLate,
      attendanceRate: Math.round(attendanceRate * 10) / 10,
      moduleStats,
      byStatus: byStatus.map((item: any) => ({ status: item._id, count: item.count })),
      bySession: bySession.map((item: any) => ({ sessionId: item._id, count: item.count })),
    };
  }

  async remove(id: string): Promise<void> {
    const result = await this.attendanceModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Attendance record with ID "' + id + '" not found');
    }
  }
}
