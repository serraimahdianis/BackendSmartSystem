import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Student, StudentDocument } from './schemas/student.schema';
import {
  Schedule,
  ScheduleDocument,
} from '../schedule/schemas/schedule.schema';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class StudentService {
  constructor(
    @InjectModel(Student.name) private studentModel: Model<StudentDocument>,
    @InjectModel(Schedule.name) private scheduleModel: Model<ScheduleDocument>,
  ) {}

  async create(createStudentDto: CreateStudentDto): Promise<Student> {
    // Auto-generate password from birthday (prefixed with 'sciences') (hashed)
    const hashedPassword = await bcrypt.hash(
      `sciences${createStudentDto.birthday}`,
      10,
    );
    const createdStudent = new this.studentModel({
      ...createStudentDto,
      password: hashedPassword,
    });
    return createdStudent.save();
  }

  async findAll(
    year?: string,
    group?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<Student>> {
    const filter: Record<string, any> = {};
    if (year) filter.year = year;
    if (group) filter.group = group;

    const total = await this.studentModel.countDocuments(filter).exec();
    const data = await this.studentModel
      .find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Returns students belonging to the teacher's schedules (year/group).
   */
  async findForTeacher(
    teacherId: string,
    year?: string,
    group?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<Student>> {
    const schedules = await this.scheduleModel.find({ teacherId }).exec();

    const conditions: any[] = [];
    if (schedules.length > 0) {
      schedules.forEach((s) => {
        if (s.type === 'cours' || !s.group) {
          conditions.push({ year: s.year });
        } else {
          conditions.push({ year: s.year, group: s.group });
        }
      });
    }

    const orConditions: any[] = [...conditions, { teacherId }];
    const filter: Record<string, any> = { $or: orConditions };

    if (year) filter.year = year;
    if (group) filter.group = group;

    const total = await this.studentModel.countDocuments(filter).exec();
    const data = await this.studentModel
      .find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Verifies if a student is assigned to a specific teacher based on schedules or direct assignment.
   */
  async isAssignedToTeacher(
    studentId: string,
    teacherId: string,
  ): Promise<boolean> {
    const student = await this.studentModel.findById(studentId).exec();
    if (!student) return false;

    // Check direct assignment first
    if ((student as any).teacherId === teacherId) return true;

    // Check schedule-based assignment
    const schedules = await this.scheduleModel.find({ teacherId }).exec();
    if (schedules.length === 0) return false;

    return schedules.some((s) => {
      const yearMatch = s.year === student.year;
      const groupMatch =
        s.type === 'cours' || !s.group || s.group === student.group;
      return yearMatch && groupMatch;
    });
  }

  /**
   * Verifies if a student (by RFID) is assigned to a teacher.
   */
  async isRfidAssignedToTeacher(
    rfidCode: string,
    teacherId: string,
  ): Promise<boolean> {
    const query: any[] = [{ rfidCode }, { qrCode: rfidCode }, { studentId: rfidCode }];
    if (rfidCode.length === 24) {
      query.push({ _id: rfidCode });
    }
    const student = await this.studentModel.findOne({
      $or: query,
    }).exec();
    if (!student) return false;
    return this.isAssignedToTeacher(student._id.toString(), teacherId);
  }

  async findOne(id: string): Promise<Student> {
    const student = await this.studentModel.findById(id).exec();
    if (!student) {
      throw new NotFoundException(`Student with ID "${id}" not found`);
    }
    return student;
  }

  async findByRfid(rfidCode: string): Promise<Student> {
    const query: any[] = [{ rfidCode }, { qrCode: rfidCode }, { studentId: rfidCode }];
    if (rfidCode.length === 24) {
      query.push({ _id: rfidCode });
    }
    const student = await this.studentModel.findOne({
      $or: query,
    }).exec();
    if (!student) {
      throw new NotFoundException(`Student with code "${rfidCode}" not found`);
    }
    return student;
  }

  async findByGroup(group: string, year: string): Promise<Student[]> {
    return this.studentModel.find({ group, year }).exec();
  }

  async update(
    id: string,
    updateStudentDto: UpdateStudentDto,
  ): Promise<Student> {
    const updatedStudent = await this.studentModel
      .findByIdAndUpdate(id, updateStudentDto, { returnDocument: 'after' })
      .exec();
    if (!updatedStudent) {
      throw new NotFoundException(`Student with ID "${id}" not found`);
    }
    return updatedStudent;
  }

  async remove(id: string): Promise<void> {
    const result = await this.studentModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Student with ID "${id}" not found`);
    }
  }
}
