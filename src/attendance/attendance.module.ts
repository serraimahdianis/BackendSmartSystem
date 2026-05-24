import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Attendance, AttendanceSchema } from './schemas/attendance.schema';
import { Student, StudentSchema } from '../student/schemas/student.schema';
import { Session, SessionSchema } from '../session/schemas/session.schema';
import { Schedule, ScheduleSchema } from '../schedule/schemas/schedule.schema';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { StudentModule } from '../student/student.module';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Attendance.name, schema: AttendanceSchema },
      { name: Student.name, schema: StudentSchema },
      { name: Session.name, schema: SessionSchema },
      { name: Schedule.name, schema: ScheduleSchema },
    ]),
    StudentModule,
    SessionModule,
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
