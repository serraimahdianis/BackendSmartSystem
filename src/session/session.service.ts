import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Session, SessionDocument } from './schemas/session.schema';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';

@Injectable()
export class SessionService {
  constructor(
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
  ) {}

  async create(createSessionDto: CreateSessionDto): Promise<Session> {
    const createdSession = new this.sessionModel(createSessionDto);
    return createdSession.save();
  }

  async findAll(): Promise<Session[]> {
    return this.sessionModel
      .find()
      .populate('teacherId', 'fullName email')
      .populate('moduleId', 'name')
      .populate('scheduleId')
      .exec();
  }

  async findOne(id: string): Promise<Session> {
    const session = await this.sessionModel
      .findById(id)
      .populate('teacherId', 'fullName email')
      .populate('moduleId', 'name')
      .populate('scheduleId')
      .exec();
    if (!session) {
      throw new NotFoundException(`Session with ID "${id}" not found`);
    }
    return session;
  }

  async findByTeacher(teacherId: string): Promise<Session[]> {
    return this.sessionModel
      .find({ teacherId })
      .populate('moduleId', 'name')
      .exec();
  }

  async findByDate(date: string): Promise<Session[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.sessionModel
      .find({ date: { $gte: startOfDay, $lte: endOfDay } })
      .populate('teacherId', 'fullName email')
      .populate('moduleId', 'name')
      .exec();
  }

  async updateStatus(id: string, status: string): Promise<Session> {
    const updatedSession = await this.sessionModel
      .findByIdAndUpdate(id, { status }, { returnDocument: 'after' })
      .exec();
    if (!updatedSession) {
      throw new NotFoundException(`Session with ID "${id}" not found`);
    }
    return updatedSession;
  }

  async update(
    id: string,
    updateSessionDto: UpdateSessionDto,
  ): Promise<Session> {
    const updatedSession = await this.sessionModel
      .findByIdAndUpdate(id, updateSessionDto, { returnDocument: 'after' })
      .exec();
    if (!updatedSession) {
      throw new NotFoundException(`Session with ID "${id}" not found`);
    }
    return updatedSession;
  }

  async remove(id: string): Promise<void> {
    const result = await this.sessionModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Session with ID "${id}" not found`);
    }
  }
}
