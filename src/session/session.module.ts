import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Session, SessionSchema } from './schemas/session.schema';
import { Schedule, ScheduleSchema } from '../schedule/schemas/schedule.schema';
import { Student, StudentSchema } from '../student/schemas/student.schema';
import {
  Attendance,
  AttendanceSchema,
} from '../attendance/schemas/attendance.schema';
import { SessionService } from './session.service';
import { SessionController } from './session.controller';
import { SessionCronService } from './session-cron.service';

import { ScheduleModule } from '../schedule/schedule.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Session.name, schema: SessionSchema },
      { name: Schedule.name, schema: ScheduleSchema },
      { name: Student.name, schema: StudentSchema },
      { name: Attendance.name, schema: AttendanceSchema },
    ]),
    ScheduleModule,
  ],
  controllers: [SessionController],
  providers: [SessionService, SessionCronService],
  exports: [SessionService],
})
export class SessionModule {}
