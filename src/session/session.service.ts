import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Session, SessionDocument } from './schemas/session.schema';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { ScheduleService } from '../schedule/schedule.service';

@Injectable()
export class SessionService {
  constructor(
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
    private readonly scheduleService: ScheduleService,
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

  async startSession(scheduleId: string, teacherId: string): Promise<Session> {
    // Use raw (unpopulated) document so teacherId is always a plain ObjectId
    const schedule = await this.scheduleService.findOneRaw(scheduleId);

    // Compare as strings — ObjectId.toString() gives the 24-char hex string
    const schedTeacherId = schedule.teacherId.toString();

    if (schedTeacherId !== teacherId) {
      throw new BadRequestException(
        'You do not have permission to start a session for this schedule.',
      );
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const startOfDay = new Date(todayStr);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(todayStr);
    endOfDay.setHours(23, 59, 59, 999);

    const existingSession = await this.sessionModel.findOne({
      scheduleId,
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    if (existingSession) {
      throw new ConflictException(
        'A session for this schedule has already been created today.',
      );
    }

    const createdSession = new this.sessionModel({
      scheduleId: schedule._id.toString(),
      teacherId: schedTeacherId,
      moduleId: schedule.moduleId.toString(),
      date: new Date(),
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      type: schedule.type,
      group: schedule.group,
      status: 'active',
      isReplacement: false,
    });

    return createdSession.save();
  }

  async endSession(sessionId: string, teacherId: string): Promise<Session> {
    const session = await this.sessionModel.findById(sessionId).exec();
    if (!session) {
      throw new NotFoundException(`Session with ID "${sessionId}" not found`);
    }

    // teacherId is stored as a plain ObjectId — compare as strings
    if (session.teacherId.toString() !== teacherId) {
      throw new BadRequestException(
        'You do not have permission to end this session.',
      );
    }

    session.status = 'closed';
    return session.save();
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
