import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Attendance, AttendanceDocument } from './schemas/attendance.schema';
import { CreateAttendanceDto } from './dto/create-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(Attendance.name)
    private attendanceModel: Model<AttendanceDocument>,
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
      .find({ sessionId })
      .populate('studentId', 'fullName studentId group')
      .exec();
  }

  async findByStudent(studentId: string): Promise<Attendance[]> {
    return this.attendanceModel
      .find({ studentId })
      .populate('sessionId')
      .exec();
  }

  async findOne(id: string): Promise<Attendance> {
    const record = await this.attendanceModel
      .findById(id)
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

  async remove(id: string): Promise<void> {
    const result = await this.attendanceModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(
        `Attendance record with ID "${id}" not found`,
      );
    }
  }
}
