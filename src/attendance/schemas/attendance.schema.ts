import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Session } from '../../session/schemas/session.schema';
import { Student } from '../../student/schemas/student.schema';

export type AttendanceDocument = HydratedDocument<Attendance>;

@Schema()
export class Attendance {
  @ApiProperty({ example: '60d5ec49f1b2c72b9c8e4a1d' })
  @Prop({ type: Types.ObjectId, ref: Session.name, required: true })
  sessionId: Types.ObjectId;

  @ApiProperty({ example: '60d5ec49f1b2c72b9c8e4a1e' })
  @Prop({ type: Types.ObjectId, ref: Student.name, required: true })
  studentId: Types.ObjectId;

  @ApiProperty({ example: 'present', enum: ['present', 'late', 'absent'] })
  @Prop({ required: true, enum: ['present', 'late', 'absent'] })
  status: string;

  @ApiProperty({ example: '2026-04-28T08:05:00.000Z', required: false })
  @Prop()
  scanTime: Date;
}

export const AttendanceSchema = SchemaFactory.createForClass(Attendance);
