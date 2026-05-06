import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Attendance, AttendanceDocument } from './schemas/attendance.schema';
import { Student, StudentDocument } from '../student/schemas/student.schema';
import { CreateAttendanceDto } from './dto/create-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(Attendance.name)
    private attendanceModel: Model<AttendanceDocument>,
    @InjectModel(Student.name)
    private studentModel: Model<StudentDocument>,
  ) {}

  async recordScan(
    createAttendanceDto: CreateAttendanceDto,
  ): Promise<Attendance> {
    // Set scanTime to now if not provided
    if (!createAttendanceDto.scanTime) {
      createAttendanceDto.scanTime = new Date().toISOString();
    }
    const record = new this.attendanceModel(createAttendanceDto);
    return record.save();
  }

  async findBySession(sessionId: string): Promise<Attendance[]> {
    return this.attendanceModel
      .find({ sessionId: new Types.ObjectId(sessionId) })
      .populate('studentId', 'fullName studentId group')
      .exec();
  }

  async findByStudent(studentId: string): Promise<Attendance[]> {
    return this.attendanceModel
      .find({ studentId: new Types.ObjectId(studentId) })
      .populate({
        path: 'sessionId',
        populate: {
          path: 'moduleId',
        },
      })
      .exec();
  }

  async findOne(id: string): Promise<Attendance> {
    const record = await this.attendanceModel
      .findById(new Types.ObjectId(id))
      .populate('studentId', 'fullName studentId group')
      .populate('sessionId')
      .exec();
    if (!record) {
      throw new NotFoundException(
        `Attendance record with ID "${id}" not found`,
      );
    }
    return record;
  }

  async getStats(studentId?: string): Promise<Record<string, any>> {
    const filter: Record<string, any> = {};
    if (studentId) {
      try {
        const studentOid = new Types.ObjectId(studentId);
        // Verify student exists to avoid returning 0s for stale sessions
        const studentExists = await this.studentModel.exists({ _id: studentOid });
        if (!studentExists) {
          throw new NotFoundException(`Student with ID "${studentId}" not found`);
        }
        filter.studentId = studentOid;
      } catch (e) {
        if (e instanceof NotFoundException) throw e;
        // Handle invalid ObjectId string
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
    const byStatus = await this.attendanceModel.aggregate<{
      _id: string;
      count: number;
    }>([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const bySession = await this.attendanceModel.aggregate<{
      _id: string;
      count: number;
    }>([
      { $match: filter },
      { $group: { _id: '$sessionId', count: { $sum: 1 } } },
    ]);

    const statsMap = byStatus.reduce(
      (acc: Record<string, number>, item) => {
        acc[item._id] = item.count;
        return acc;
      },
      {} as Record<string, number>,
    );

    const totalPresent = statsMap['present'] || 0;
    const totalAbsent = statsMap['absent'] || 0;
    const totalLate = statsMap['late'] || 0;
    const attendanceRate =
      total > 0 ? ((totalPresent + totalLate) / total) * 100 : 0;

    // Aggregate module stats
    const moduleStats = await this.attendanceModel.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'sessions',
          localField: 'sessionId',
          foreignField: '_id',
          as: 'session',
        },
      },
      { $unwind: '$session' },
      {
        $lookup: {
          from: 'modules',
          localField: 'session.moduleId',
          foreignField: '_id',
          as: 'module',
        },
      },
      { $unwind: '$module' },
      {
        $group: {
          _id: '$module._id',
          moduleName: { $first: '$module.name' },
          moduleCode: { $first: '$module.code' },
          present: {
            $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] },
          },
          absent: {
            $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] },
          },
          late: {
            $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] },
          },
          total: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          moduleId: '$_id',
          moduleName: 1,
          moduleCode: 1,
          present: 1,
          absent: 1,
          late: 1,
          total: 1,
          attendanceRate: {
            $multiply: [
              { $divide: [{ $add: ['$present', '$late'] }, '$total'] },
              100,
            ],
          },
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
      byStatus: byStatus.map((item) => ({
        status: item._id,
        count: item.count,
      })),
      bySession: bySession.map((item) => ({
        sessionId: item._id,
        count: item.count,
      })),
    };
  }

  async remove(id: string): Promise<void> {
    const result = await this.attendanceModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(
        `Attendance record with ID "${id}" not found`,
      );
    }
  }
}
