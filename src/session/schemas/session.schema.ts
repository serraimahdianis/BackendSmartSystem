import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Teacher } from '../../teacher/schemas/teacher.schema';
import { AcademicModule } from '../../module/schemas/module.schema';
import { Schedule } from '../../schedule/schemas/schedule.schema';

export type SessionDocument = HydratedDocument<Session>;

@Schema()
export class Session {
  @ApiProperty({ example: '60d5ec49f1b2c72b9c8e4a1c', required: false })
  @Prop({ type: Types.ObjectId, ref: Schedule.name, default: null })
  scheduleId: Types.ObjectId;

  @ApiProperty({ example: '60d5ec49f1b2c72b9c8e4a1a' })
  @Prop({ type: Types.ObjectId, ref: Teacher.name, required: true })
  teacherId: Types.ObjectId;

  @ApiProperty({ example: '60d5ec49f1b2c72b9c8e4a1b' })
  @Prop({ type: Types.ObjectId, ref: AcademicModule.name, required: true })
  moduleId: Types.ObjectId;

  @ApiProperty({ example: '2026-04-28' })
  @Prop({ required: true })
  date: Date;

  @ApiProperty({ example: '08:00' })
  @Prop({ required: true })
  startTime: string;

  @ApiProperty({ example: '09:30' })
  @Prop({ required: true })
  endTime: string;

  @ApiProperty({ example: 'td', enum: ['cours', 'td', 'tp'] })
  @Prop({ required: true, enum: ['cours', 'td', 'tp'] })
  type: string;

  @ApiProperty({ example: '2A' })
  @Prop()
  group: string;

  @ApiProperty({
    example: 'planned',
    enum: ['planned', 'active', 'closed', 'canceled'],
    description: 'Session lifecycle status',
  })
  @Prop({
    required: true,
    enum: ['planned', 'active', 'closed', 'canceled'],
    default: 'planned',
  })
  status: string;

  @ApiProperty({ example: false })
  @Prop({ default: false })
  isReplacement: boolean;

  @ApiProperty({ example: 'Teacher was sick on Sunday', required: false })
  @Prop()
  reasonForReplacement: string;
}

export const SessionSchema = SchemaFactory.createForClass(Session);

SessionSchema.index({ moduleId: 1, date: -1 });
SessionSchema.index({ teacherId: 1, date: -1 });
SessionSchema.index({ status: 1, date: -1 });
SessionSchema.index({ date: -1 });
