import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Session, SessionDocument } from './schemas/session.schema';
import {
  Schedule,
  ScheduleDocument,
} from '../schedule/schemas/schedule.schema';
import {
  Attendance,
  AttendanceDocument,
} from '../attendance/schemas/attendance.schema';
import { SessionService } from './session.service';

@Injectable()
export class SessionCronService implements OnModuleInit {
  private readonly logger = new Logger(SessionCronService.name);

  /** Day-of-week index → name, matching the Schedule schema enum */
  private readonly DAYS = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];

  /** Minutes after startTime before a 'planned' session is auto-canceled */
  private readonly GRACE_PERIOD_MINUTES = 30;

  constructor(
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
    @InjectModel(Schedule.name) private scheduleModel: Model<ScheduleDocument>,
    @InjectModel(Attendance.name)
    private attendanceModel: Model<AttendanceDocument>,
    private readonly sessionService: SessionService,
  ) {}

  async onModuleInit() {
    await this.cleanupOldSessions();
  }

  // ─── HELPER ──────────────────────────────────────────────────────────────────

  /**
   * Parses an "HH:MM" time string into a Date object for today.
   * Returns a Date with today's year/month/day and the given hours:minutes.
   */
  private parseTimeToday(time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hours,
      minutes,
      0,
      0,
    );
  }

  /**
   * Returns { startOfDay, endOfDay } Date range for today (local server time).
   */
  private getTodayRange(): { startOfDay: Date; endOfDay: Date } {
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0,
    );
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );
    return { startOfDay, endOfDay };
  }

  /**
   * Cleans up all sessions and their corresponding attendance records
   * that are older than the start of the current week (Monday 00:00).
   */
  async cleanupOldSessions(): Promise<void> {
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

    this.logger.log(
      `🧹 Cleaning up sessions older than start of week (${startOfWeek.toISOString()})...`,
    );

    // 1. Find matching old sessions
    const oldSessions = await this.sessionModel
      .find({ date: { $lt: startOfWeek } })
      .select('_id')
      .exec();

    if (oldSessions.length > 0) {
      const oldSessionIds = oldSessions.map((s) => s._id);

      // 2. Delete corresponding attendance records
      const attendanceResult = await this.attendanceModel
        .deleteMany({ sessionId: { $in: oldSessionIds } })
        .exec();

      // 3. Delete the sessions
      const sessionResult = await this.sessionModel
        .deleteMany({ _id: { $in: oldSessionIds } })
        .exec();

      this.logger.log(
        `✅ Removed ${sessionResult.deletedCount} old session(s) and ${attendanceResult.deletedCount} attendance record(s) from previous weeks.`,
      );
    } else {
      this.logger.log(`✅ No old sessions found to clean up.`);
    }
  }

  // ─── JOB 1: DAILY SESSION PRE-GENERATION (MIDNIGHT) ─────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateDailySessions(): Promise<void> {
    await this.cleanupOldSessions();
    const todayName = this.DAYS[new Date().getDay()];
    this.logger.log(`⏰ [Daily Job] Generating sessions for ${todayName}...`);

    // 1. Find all recurring schedules that match today's day
    const schedules = await this.scheduleModel
      .find({ dayOfWeek: todayName })
      .exec();

    if (schedules.length === 0) {
      this.logger.log(`📭 No schedules found for ${todayName}. Skipping.`);
      return;
    }

    // 2. Check which schedules already have a session created for today
    //    (prevents duplicates on server restarts or re-deployments)
    const { startOfDay, endOfDay } = this.getTodayRange();

    const existingSessions = await this.sessionModel
      .find({
        scheduleId: { $in: schedules.map((s) => s._id) },
        date: { $gte: startOfDay, $lte: endOfDay },
      })
      .select('scheduleId')
      .exec();

    const existingScheduleIds = new Set(
      existingSessions.map((s) => s.scheduleId.toString()),
    );

    // 3. Build new session documents only for schedules without today's session
    const newSessions = schedules
      .filter((schedule) => !existingScheduleIds.has(schedule._id.toString()))
      .map((schedule) => ({
        scheduleId: schedule._id,
        teacherId: schedule.teacherId,
        moduleId: schedule.moduleId,
        date: new Date(),
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        type: schedule.type,
        group: schedule.group || undefined,
        speciality: schedule.speciality ?? null,
        year: schedule.year,
        status: 'planned',
        isReplacement: false,
      }));

    if (newSessions.length === 0) {
      this.logger.log(
        `✅ All ${schedules.length} sessions for ${todayName} already exist. No duplicates created.`,
      );
      return;
    }

    // 4. Bulk insert for performance
    await this.sessionModel.insertMany(newSessions);
    this.logger.log(
      `🎉 Created ${newSessions.length} planned session(s) for ${todayName}.`,
    );
  }

  // ─── JOB 2: AUTO-CANCEL EXPIRED SESSIONS (EVERY 15 MIN) ─────────────────────

  @Cron('0 */15 * * * *')
  async autoCancelExpiredSessions(): Promise<void> {
    const { startOfDay, endOfDay } = this.getTodayRange();
    const now = new Date();

    // 1. Find all sessions that are still 'planned' for today
    const plannedSessions = await this.sessionModel
      .find({
        date: { $gte: startOfDay, $lte: endOfDay },
        status: 'planned',
      })
      .exec();

    if (plannedSessions.length === 0) {
      return; // Nothing to clean up — stay silent to keep logs clean
    }

    // 2. Determine which sessions have exceeded the grace period
    const sessionsToCancel: SessionDocument[] = [];

    for (const session of plannedSessions) {
      const startDate = this.parseTimeToday(session.startTime);
      const deadline = new Date(
        startDate.getTime() + this.GRACE_PERIOD_MINUTES * 60 * 1000,
      );

      if (now > deadline) {
        sessionsToCancel.push(session);
      }
    }

    if (sessionsToCancel.length === 0) {
      return; // All planned sessions are still within their grace period
    }

    // 3. Bulk update for performance
    const cancelIds = sessionsToCancel.map((s) => s._id);
    await this.sessionModel.updateMany(
      { _id: { $in: cancelIds } },
      { $set: { status: 'canceled' } },
    );

    this.logger.warn(
      `🚫 Auto-canceled ${sessionsToCancel.length} expired session(s): ${cancelIds.join(', ')}`,
    );
  }

  // ─── JOB 3: AUTO-START SCHEDULED SESSIONS (EVERY MINUTE) ───────────────────

  @Cron(CronExpression.EVERY_MINUTE)
  async autoStartScheduledSessions(): Promise<void> {
    const todayName = this.DAYS[new Date().getDay()];
    const { startOfDay, endOfDay } = this.getTodayRange();

    // Find all schedules matching today
    const schedules = await this.scheduleModel
      .find({ dayOfWeek: todayName })
      .exec();

    if (schedules.length === 0) {
      return;
    }

    const now = new Date();
    const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

    for (const schedule of schedules) {
      const [startH, startM] = schedule.startTime.split(':').map(Number);
      const [endH, endM] = schedule.endTime.split(':').map(Number);
      const startTotalMinutes = startH * 60 + startM;
      const endTotalMinutes = endH * 60 + endM;

      // If current time is within the schedule timeframe
      if (
        currentTotalMinutes >= startTotalMinutes &&
        currentTotalMinutes < endTotalMinutes
      ) {
        // Check if a session already exists for today
        const existingSession = await this.sessionModel
          .findOne({
            scheduleId: schedule._id,
            date: { $gte: startOfDay, $lte: endOfDay },
          })
          .exec();

        if (!existingSession) {
          this.logger.log(
            `⏰ [Auto-Start] Creating and starting new session for schedule ${schedule._id.toString()} (${schedule.startTime} - ${schedule.endTime})`,
          );

          const newSession = new this.sessionModel({
            scheduleId: schedule._id,
            teacherId: schedule.teacherId,
            moduleId: schedule.moduleId,
            date: new Date(),
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            type: schedule.type,
            group: schedule.group || undefined,
            speciality: schedule.speciality ?? null,
            year: schedule.year,
            status: 'active',
            isReplacement: false,
          });

          const saved = await newSession.save();
          await this.sessionService.handleSessionStatusTransition(
            saved,
            'planned',
            'active',
          );
        } else if (existingSession.status === 'planned') {
          this.logger.log(
            `⏰ [Auto-Start] Activating existing planned session ${existingSession._id.toString()} for schedule ${schedule._id.toString()}`,
          );
          existingSession.status = 'active';
          const saved = await existingSession.save();
          await this.sessionService.handleSessionStatusTransition(
            saved,
            'planned',
            'active',
          );
        }
      }
    }
  }
}
