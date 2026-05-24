import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Teacher } from '../../teacher/schemas/teacher.schema';
import { AcademicModule } from '../../module/schemas/module.schema';

export type ScheduleDocument = HydratedDocument<Schedule>;

@Schema()
export class Schedule {
  @ApiProperty({ example: '60d5ec49f1b2c72b9c8e4a1a' })
  @Prop({ type: Types.ObjectId, ref: Teacher.name, required: true })
  teacherId: Types.ObjectId;

  @ApiProperty({ example: '60d5ec49f1b2c72b9c8e4a1b' })
  @Prop({ type: Types.ObjectId, ref: AcademicModule.name, required: true })
  moduleId: Types.ObjectId;

  @ApiProperty({ example: 'td', enum: ['cours', 'td', 'tp'] })
  @Prop({ required: true, enum: ['cours', 'td', 'tp'] })
  type: string;

  @ApiProperty({ example: 'L2', enum: ['L1', 'L2', 'L3', 'M1', 'M2'] })
  @Prop({ required: true, enum: ['L1', 'L2', 'L3', 'M1', 'M2'] })
  year: string;

  @ApiProperty({
    example: '2A',
    description: 'Null if type is cours (whole year)',
  })
  @Prop()
  group: string;

  @ApiProperty({
    example: 'Sunday',
    enum: [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ],
  })
  @Prop({
    required: true,
    enum: [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ],
  })
  dayOfWeek: string;

  @ApiProperty({ example: '08:00', description: 'Start time in HH:MM format' })
  @Prop({ required: true })
  startTime: string;

  @ApiProperty({ example: '09:30', description: 'End time in HH:MM format' })
  @Prop({ required: true })
  endTime: string;

  @ApiProperty({ example: 'Room A101' })
  @Prop({ required: true })
  room: string;
}

export const ScheduleSchema = SchemaFactory.createForClass(Schedule);

ScheduleSchema.index({ teacherId: 1, dayOfWeek: 1 });
ScheduleSchema.index({ moduleId: 1 });
ScheduleSchema.index({ year: 1, group: 1, dayOfWeek: 1 });
