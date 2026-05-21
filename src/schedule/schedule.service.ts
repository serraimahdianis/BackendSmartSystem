import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Schedule, ScheduleDocument } from './schemas/schedule.schema';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ScheduleService {
  constructor(
    @InjectModel(Schedule.name) private scheduleModel: Model<ScheduleDocument>,
  ) {}

  async create(createScheduleDto: CreateScheduleDto): Promise<Schedule> {
    const createdSchedule = new this.scheduleModel(createScheduleDto);
    return createdSchedule.save();
  }

  async findAll(page: number = 1, limit: number = 20): Promise<PaginatedResult<Schedule>> {
    const total = await this.scheduleModel.countDocuments().exec();
    const data = await this.scheduleModel
      .find()
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('teacherId', 'fullName email')
      .populate('moduleId', 'name')
      .exec();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string): Promise<Schedule> {
    const schedule = await this.scheduleModel
      .findById(id)
      .populate('teacherId', 'fullName email')
      .populate('moduleId', 'name')
      .exec();
    if (!schedule) {
      throw new NotFoundException(`Schedule with ID "${id}" not found`);
    }
    return schedule;
  }

  /** Returns the raw, unpopulated document — use this for ownership checks */
  async findOneRaw(id: string): Promise<ScheduleDocument> {
    const schedule = await this.scheduleModel.findById(id).exec();
    if (!schedule) {
      throw new NotFoundException(`Schedule with ID "${id}" not found`);
    }
    return schedule;
  }

  async findByTeacher(teacherId: string, page: number = 1, limit: number = 20): Promise<PaginatedResult<Schedule>> {
    const total = await this.scheduleModel.countDocuments({ teacherId }).exec();
    const data = await this.scheduleModel
      .find({ teacherId })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('moduleId', 'name')
      .exec();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async update(
    id: string,
    updateScheduleDto: UpdateScheduleDto,
  ): Promise<Schedule> {
    const updatedSchedule = await this.scheduleModel
      .findByIdAndUpdate(id, updateScheduleDto, { returnDocument: 'after' })
      .exec();
    if (!updatedSchedule) {
      throw new NotFoundException(`Schedule with ID "${id}" not found`);
    }
    return updatedSchedule;
  }

  async remove(id: string): Promise<void> {
    const result = await this.scheduleModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Schedule with ID "${id}" not found`);
    }
  }
}
