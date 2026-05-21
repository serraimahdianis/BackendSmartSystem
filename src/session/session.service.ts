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
import { EventsGateway } from '../events/events.gateway';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class SessionService {
  constructor(
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
    private readonly scheduleService: ScheduleService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async create(createSessionDto: CreateSessionDto): Promise<Session> {
    const createdSession = new this.sessionModel(createSessionDto);
    return createdSession.save();
  }

  async findAll(page: number = 1, limit: number = 20): Promise<PaginatedResult<Session>> {
    const total = await this.sessionModel.countDocuments().exec();
    const data = await this.sessionModel
      .find()
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('teacherId', 'fullName email')
      .populate('moduleId', 'name')
      .populate('scheduleId')
      .exec();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
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

  async findByTeacher(teacherId: string, page: number = 1, limit: number = 20): Promise<PaginatedResult<Session>> {
    const total = await this.sessionModel.countDocuments({ teacherId }).exec();
    const data = await this.sessionModel
      .find({ teacherId })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('moduleId', 'name')
      .exec();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findByDate(date: string, page: number = 1, limit: number = 20): Promise<PaginatedResult<Session>> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const filter = { date: { $gte: startOfDay, $lte: endOfDay } };
    const total = await this.sessionModel.countDocuments(filter).exec();
    const data = await this.sessionModel
      .find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('teacherId', 'fullName email')
      .populate('moduleId', 'name')
      .exec();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
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

    const saved = await createdSession.save();

    const populated = await this.sessionModel
      .findById(saved._id)
      .populate('moduleId', 'name')
      .exec();

    this.eventsGateway.emitSessionStarted({
      sessionId: saved._id.toString(),
      moduleId: schedule.moduleId.toString(),
      moduleName: (populated?.moduleId as any)?.name || 'Unknown',
      group: schedule.group || '',
      teacherId,
      startTime: schedule.startTime,
    });

    return saved;
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
    const saved = await session.save();

    this.eventsGateway.emitSessionEnded({
      sessionId: saved._id.toString(),
      teacherId,
    });

    return saved;
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
