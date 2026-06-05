import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Student, StudentDocument } from './schemas/student.schema';
import {
  Schedule,
  ScheduleDocument,
} from '../schedule/schemas/schedule.schema';
import { Teacher, TeacherDocument } from '../teacher/schemas/teacher.schema';
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
    @InjectModel(Teacher.name) private teacherModel: Model<TeacherDocument>,
  ) {}

  async create(createStudentDto: CreateStudentDto): Promise<Student> {
    // Auto-generate password from birthday (hashed)
    const hashedPassword = await bcrypt.hash(createStudentDto.birthday, 10);
    // Auto-generate qrCode if not provided
    const qrCode =
      createStudentDto.qrCode ||
      `QR-${createStudentDto.group}-${createStudentDto.studentId}`;
    const createdStudent = new this.studentModel({
      ...createStudentDto,
      qrCode,
      password: hashedPassword,
    });
    return createdStudent.save();
  }

  async findAll(
    year?: string,
    group?: string,
    speciality?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<Student>> {
    const filter: Record<string, any> = {};
    if (year) filter.year = year;
    if (group) filter.group = group;
    if (speciality) filter.speciality = speciality;

    const total = await this.studentModel.countDocuments(filter).exec();
    const data = await this.studentModel
      .find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Returns students belonging to the teacher's directly assigned groups/years/specialities.
   */
  async findForTeacher(
    teacherId: string,
    year?: string,
    group?: string,
    speciality?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<Student>> {
    const teacher = await this.teacherModel.findById(teacherId).exec();
    if (!teacher) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    // If teacher has absolutely no assignments, return empty results
    if (
      (!teacher.years || teacher.years.length === 0) &&
      (!teacher.groups || teacher.groups.length === 0) &&
      (!teacher.specialities || teacher.specialities.length === 0)
    ) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    const filter: Record<string, any> = {};

    // Base filter: must be in teacher's assigned arrays (if arrays are not empty)
    if (teacher.years?.length > 0) filter.year = { $in: teacher.years };

    // Groups: normalize to handle "G01" vs "01" mismatch
    // For each teacher group, generate regex patterns that match both formats
    if (teacher.groups?.length > 0) {
      const groupPatterns = teacher.groups.flatMap((g) => {
        const numericPart = g.replace(/^[Gg]/, ''); // "G01" -> "01"
        const withPrefix = `G${numericPart}`;       // "01" -> "G01"
        return [g, numericPart, withPrefix];
      });
      const uniquePatterns = [...new Set(groupPatterns)];
      filter.group = { $in: uniquePatterns };
    }

    if (teacher.specialities?.length > 0)
      filter.speciality = { $in: teacher.specialities };

    // Query param overrides (intersection)
    if (year) {
      if (!teacher.years?.length || teacher.years.includes(year))
        filter.year = year;
      else return { data: [], total: 0, page, limit, totalPages: 0 };
    }
    if (group) {
      // Normalize the query param group too
      const numericPart = group.replace(/^[Gg]/, '');
      const withPrefix = `G${numericPart}`;
      const teacherGroupNorm = teacher.groups?.map((g) => g.replace(/^[Gg]/, '')) ?? [];
      if (!teacher.groups?.length || teacherGroupNorm.includes(numericPart))
        filter.group = { $in: [group, numericPart, withPrefix] };
      else return { data: [], total: 0, page, limit, totalPages: 0 };
    }
    if (speciality) {
      if (
        !teacher.specialities?.length ||
        teacher.specialities.includes(speciality)
      )
        filter.speciality = speciality;
      else return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    const total = await this.studentModel.countDocuments(filter).exec();
    const data = await this.studentModel
      .find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Verifies if a student is assigned to a specific teacher via direct metadata arrays.
   */
  async isAssignedToTeacher(
    studentId: string,
    teacherId: string,
  ): Promise<boolean> {
    const student = await this.studentModel.findById(studentId).exec();
    if (!student) return false;

    const teacher = await this.teacherModel.findById(teacherId).exec();
    if (!teacher) return false;

    // If teacher has absolutely no assignments, they cannot access any student
    if (
      (!teacher.years || teacher.years.length === 0) &&
      (!teacher.groups || teacher.groups.length === 0) &&
      (!teacher.specialities || teacher.specialities.length === 0)
    ) {
      return false;
    }

    const yearOk =
      !teacher.years || teacher.years.length === 0 || teacher.years.includes(student.year);
    
    // Normalize group comparison: "G01" should match "01" and vice versa
    const studentGroupNorm = student.group?.replace(/^[Gg]/, '') ?? '';
    const teacherGroupsNorm = (teacher.groups ?? []).map((g) => g.replace(/^[Gg]/, ''));
    const groupOk =
      !teacher.groups || teacher.groups.length === 0 || teacherGroupsNorm.includes(studentGroupNorm);

    const specialityOk =
      !teacher.specialities || teacher.specialities.length === 0 || teacher.specialities.includes(student.speciality);

    return yearOk && groupOk && specialityOk;
  }

  /**
   * Verifies if a student (by RFID) is assigned to a teacher.
   */
  async isRfidAssignedToTeacher(
    rfidCode: string,
    teacherId: string,
  ): Promise<boolean> {
    const query: any[] = [
      { rfidCode },
      { qrCode: rfidCode },
      { studentId: rfidCode },
    ];
    if (rfidCode.length === 24) {
      query.push({ _id: rfidCode });
    }
    const student = await this.studentModel
      .findOne({
        $or: query,
      })
      .exec();
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
    const query: any[] = [
      { rfidCode },
      { qrCode: rfidCode },
      { studentId: rfidCode },
    ];
    if (rfidCode.length === 24) {
      query.push({ _id: rfidCode });
    }
    const student = await this.studentModel
      .findOne({
        $or: query,
      })
      .exec();
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
