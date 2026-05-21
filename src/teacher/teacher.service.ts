import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Teacher, TeacherDocument } from './schemas/teacher.schema';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class TeacherService {
  constructor(
    @InjectModel(Teacher.name) private teacherModel: Model<TeacherDocument>,
  ) {}

  async create(createTeacherDto: CreateTeacherDto): Promise<Teacher> {
    const createdTeacher = new this.teacherModel(createTeacherDto);
    return createdTeacher.save();
  }

  async findAll(page: number = 1, limit: number = 20): Promise<PaginatedResult<Teacher>> {
    const total = await this.teacherModel.countDocuments().exec();
    const data = await this.teacherModel
      .find()
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string): Promise<Teacher> {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new NotFoundException(`Teacher with ID "${id}" not found`);
    }
    const teacher = await this.teacherModel.findById(id).exec();
    if (!teacher) {
      throw new NotFoundException(`Teacher with ID "${id}" not found`);
    }
    return teacher;
  }

  async findByEmail(email: string): Promise<Teacher> {
    const teacher = await this.teacherModel.findOne({ email }).exec();
    if (!teacher) {
      throw new NotFoundException(`Teacher with email "${email}" not found`);
    }
    return teacher;
  }

  async update(
    id: string,
    updateTeacherDto: UpdateTeacherDto,
  ): Promise<Teacher> {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new NotFoundException(`Teacher with ID "${id}" not found`);
    }
    const updatedTeacher = await this.teacherModel
      .findByIdAndUpdate(id, updateTeacherDto, { returnDocument: 'after' })
      .exec();
    if (!updatedTeacher) {
      throw new NotFoundException(`Teacher with ID "${id}" not found`);
    }
    return updatedTeacher;
  }

  async remove(id: string): Promise<void> {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new NotFoundException(`Teacher with ID "${id}" not found`);
    }
    const result = await this.teacherModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Teacher with ID "${id}" not found`);
    }
  }
}
