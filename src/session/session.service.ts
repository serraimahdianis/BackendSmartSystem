import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Session, SessionDocument } from './schemas/session.schema';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { ScheduleService } from '../schedule/schedule.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventsGateway } from '../events/events.gateway';
import { Student, StudentDocument } from '../student/schemas/student.schema';
import {
  Attendance,
  AttendanceDocument,
} from '../attendance/schemas/attendance.schema';

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
    @InjectModel(Student.name) private studentModel: Model<StudentDocument>,
    @InjectModel(Attendance.name)
    private attendanceModel: Model<AttendanceDocument>,
    private readonly scheduleService: ScheduleService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async create(createSessionDto: CreateSessionDto): Promise<Session> {
    const createdSession = new this.sessionModel(createSessionDto);
    return createdSession.save();
  }

  private getThisWeekRange(): { startOfWeek: Date; endOfWeek: Date } {
    const now = new Date();
    const currentDay = now.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const startOfWeek = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + distanceToMonday,
      0,
      0,
      0,
      0,
    );
    const endOfWeek = new Date(
      startOfWeek.getFullYear(),
      startOfWeek.getMonth(),
      startOfWeek.getDate() + 6,
      23,
      59,
      59,
      999,
    );
    return { startOfWeek, endOfWeek };
  }

  async findAll(
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<Session>> {
    const { startOfWeek, endOfWeek } = this.getThisWeekRange();
    const filter = { date: { $gte: startOfWeek, $lte: endOfWeek } };
    const total = await this.sessionModel.countDocuments(filter).exec();
    const data = await this.sessionModel
      .find(filter)
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
      .populate('moduleId', 'name year')
      .populate('scheduleId', 'room dayOfWeek')
      .exec();
    if (!session) {
      throw new NotFoundException(`Session with ID "${id}" not found`);
    }
    return session;
  }

  async findByTeacher(
    teacherId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<Session>> {
    const { startOfWeek, endOfWeek } = this.getThisWeekRange();
    const filter = {
      teacherId,
      date: { $gte: startOfWeek, $lte: endOfWeek },
    };
    const total = await this.sessionModel.countDocuments(filter).exec();
    const data = await this.sessionModel
      .find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('moduleId', 'name year')
      .populate('scheduleId', 'room dayOfWeek')
      .sort({ date: -1 })
      .exec();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findByDate(
    date: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<Session>> {
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

  async findByTeacherAndDate(
    teacherId: string,
    date: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<Session>> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const filter = {
      teacherId,
      date: { $gte: startOfDay, $lte: endOfDay },
    };
    const total = await this.sessionModel.countDocuments(filter).exec();
    const data = await this.sessionModel
      .find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('moduleId', 'name year')
      .populate('scheduleId', 'room dayOfWeek')
      .exec();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  public async handleSessionStatusTransition(
    session: SessionDocument,
    oldStatus: string,
    newStatus: string,
  ): Promise<void> {
    if (oldStatus !== 'active' && newStatus === 'active') {
      // 1. Check if we already have attendance records to avoid duplicates
      const existingCount = await this.attendanceModel
        .countDocuments({ sessionId: session._id })
        .exec();
      if (existingCount === 0) {
        const populatedSession = await this.sessionModel
          .findById(session._id)
          .populate('moduleId')
          .exec();
        if (
          populatedSession &&
          populatedSession.moduleId &&
          typeof populatedSession.moduleId === 'object' &&
          'year' in populatedSession.moduleId
        ) {
          const year = (populatedSession.moduleId as { year: string }).year;
          const filter: { year: string; group?: string; speciality?: string } =
            { year };
          if (session.group && session.group.toLowerCase() !== 'whole year') {
            filter.group = session.group;
          }
          // Only enroll students of the matching speciality
          if (session.speciality) {
            filter.speciality = session.speciality;
          }
          const students = await this.studentModel.find(filter).exec();
          if (students.length > 0) {
            const absentRecords = students.map((s) => ({
              sessionId: session._id,
              studentId: s._id,
              status: 'absent',
              scanTime: null,
              method: 'MANUAL',
            }));
            await this.attendanceModel.insertMany(absentRecords);
          }
        }
      }

      // 2. Emit session:started WebSocket event
      let moduleName = 'Unknown';
      const populated = await this.sessionModel
        .findById(session._id)
        .populate('moduleId', 'name')
        .exec();
      if (
        populated &&
        typeof populated.moduleId === 'object' &&
        'name' in populated.moduleId
      ) {
        moduleName = (populated.moduleId as { name: string }).name;
      }

      this.eventsGateway.emitSessionStarted({
        sessionId: session._id.toString(),
        moduleId: session.moduleId.toString(),
        moduleName,
        group: session.group || '',
        teacherId: session.teacherId.toString(),
        startTime: session.startTime,
      });
    } else if (oldStatus === 'active' && newStatus === 'closed') {
      this.eventsGateway.emitSessionEnded({
        sessionId: session._id.toString(),
        teacherId: session.teacherId.toString(),
      });
    }
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
      speciality: schedule.speciality ?? null,
      year: schedule.year,
      status: 'active',
      isReplacement: false,
    });

    const saved = await createdSession.save();

    await this.handleSessionStatusTransition(saved, 'planned', 'active');

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

    const oldStatus = session.status;
    session.status = 'closed';
    const saved = await session.save();

    await this.handleSessionStatusTransition(saved, oldStatus, 'closed');

    return saved;
  }

  async updateStatus(
    id: string,
    status: string,
    userId: string,
    role: string,
  ): Promise<Session> {
    const session = await this.sessionModel.findById(id).exec();
    if (!session) {
      throw new NotFoundException(`Session with ID "${id}" not found`);
    }
    if (role === 'teacher' && session.teacherId.toString() !== userId) {
      throw new ForbiddenException('You do not own this session');
    }
    const oldStatus = session.status;
    session.status = status;
    const saved = await session.save();

    await this.handleSessionStatusTransition(saved, oldStatus, status);

    return saved;
  }

  async update(
    id: string,
    updateSessionDto: UpdateSessionDto,
    userId: string,
    role: string,
  ): Promise<Session> {
    const session = await this.sessionModel.findById(id).exec();
    if (!session) {
      throw new NotFoundException(`Session with ID "${id}" not found`);
    }
    if (role === 'teacher' && session.teacherId.toString() !== userId) {
      throw new ForbiddenException('You do not own this session');
    }
    const oldStatus = session.status;
    Object.assign(session, updateSessionDto);
    const saved = await session.save();

    await this.handleSessionStatusTransition(saved, oldStatus, saved.status);

    return saved;
  }

  async assertTeacherOwnsSession(
    sessionId: string,
    userId: string,
    role: string,
  ): Promise<void> {
    if (role === 'admin') return;
    const session = await this.sessionModel.findById(sessionId).exec();
    if (!session) {
      throw new NotFoundException(`Session with ID "${sessionId}" not found`);
    }
    if (session.teacherId.toString() !== userId) {
      throw new ForbiddenException('You do not own this session');
    }
  }

  async remove(id: string): Promise<void> {
    const result = await this.sessionModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Session with ID "${id}" not found`);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async autoEndSessions() {
    const activeSessions = await this.sessionModel
      .find({ status: 'active' })
      .exec();
    const now = new Date();

    for (const session of activeSessions) {
      if (!session.endTime || !session.date) continue;

      const [endHour, endMinute] = session.endTime.split(':').map(Number);
      const sessionEndDate = new Date(session.date);
      sessionEndDate.setHours(endHour, endMinute, 0, 0);

      if (now.getTime() >= sessionEndDate.getTime()) {
        const oldStatus = session.status;
        session.status = 'closed';
        const saved = await session.save();
        await this.handleSessionStatusTransition(saved, oldStatus, 'closed');
      }
    }
  }
}
