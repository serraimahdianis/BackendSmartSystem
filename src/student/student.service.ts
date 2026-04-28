import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Student, StudentDocument } from './schemas/student.schema';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@Injectable()
export class StudentService {
  constructor(
    @InjectModel(Student.name) private studentModel: Model<StudentDocument>,
  ) {}

  async create(createStudentDto: CreateStudentDto): Promise<Student> {
    // Auto-generate password from birthday (hashed)
    const hashedPassword = await bcrypt.hash(createStudentDto.birthday, 10);
    const createdStudent = new this.studentModel({
      ...createStudentDto,
      password: hashedPassword,
    });
    return createdStudent.save();
  }

  async findAll(): Promise<Student[]> {
    return this.studentModel.find().exec();
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
