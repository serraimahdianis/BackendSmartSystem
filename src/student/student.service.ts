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

  async findAll(): Promise<Student[]> {
    return this.studentModel.find().exec();
  }

  /**
   * Returns students belonging to the teacher's schedules (year/group).
   */
  async findForTeacher(teacherId: string): Promise<Student[]> {
    const schedules = await this.scheduleModel.find({ teacherId }).exec();
    if (schedules.length === 0) return [];

    const conditions = schedules.map((s) => {
      if (s.type === 'cours' || !s.group) {
        return { year: s.year };
      }
      return { year: s.year, group: s.group };
    });

    return this.studentModel.find({ $or: conditions }).exec();
  }

  /**
   * Verifies if a student is assigned to a specific teacher based on schedules.
   */
  async isAssignedToTeacher(
    studentId: string,
    teacherId: string,
  ): Promise<boolean> {
    const [student, schedules] = await Promise.all([
      this.studentModel.findById(studentId).exec(),
      this.scheduleModel.find({ teacherId }).exec(),
    ]);

    if (!student || schedules.length === 0) return false;

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
    const student = await this.studentModel.findOne({ rfidCode }).exec();
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
    const student = await this.studentModel.findOne({ rfidCode }).exec();
    if (!student) {
      throw new NotFoundException(`Student with RFID "${rfidCode}" not found`);
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
