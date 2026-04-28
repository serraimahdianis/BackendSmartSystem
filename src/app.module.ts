import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { TeacherModule } from './teacher/teacher.module';
import { StudentModule } from './student/student.module';
import { AcademicModuleModule } from './module/module.module';
import { ScheduleModule } from './schedule/schedule.module';
import { SessionModule } from './session/session.module';
import { AttendanceModule } from './attendance/attendance.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('mongo_uri'),
        retryAttempts: 5,
        retryDelay: 3000,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    TeacherModule,
    StudentModule,
    AcademicModuleModule,
    ScheduleModule,
    SessionModule,
    AttendanceModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
