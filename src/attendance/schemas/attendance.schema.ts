import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Session } from '../../session/schemas/session.schema';
import { Student } from '../../student/schemas/student.schema';

export type AttendanceDocument = HydratedDocument<Attendance>;

@Schema({ timestamps: true })
export class Attendance {
  @ApiProperty({ example: '60d5ec49f1b2c72b9c8e4a1d' })
  @Prop({
    type: Types.ObjectId,
    ref: Session.name,
    required: true,
    index: true,
  })
  sessionId: Types.ObjectId;

  @ApiProperty({ example: '60d5ec49f1b2c72b9c8e4a1e' })
  @Prop({
    type: Types.ObjectId,
    ref: Student.name,
    required: true,
    index: true,
  })
  studentId: Types.ObjectId;

  @ApiProperty({ example: 'present', enum: ['present', 'late', 'absent'] })
  @Prop({ required: true, enum: ['present', 'late', 'absent'] })
  status: string;

  @ApiProperty({ example: '2026-04-28T08:05:00.000Z', required: false })
  @Prop({ index: true })
  scanTime: Date;

  @ApiProperty({
    example: 'RFID',
    enum: ['RFID', 'QR', 'MANUAL'],
    required: false,
  })
  @Prop({ enum: ['RFID', 'QR', 'MANUAL'], default: 'RFID' })
  method: string;

  @ApiProperty({ example: 0, required: false })
  @Prop({ default: 0 })
  riskScore: number;

  @ApiProperty({ example: 'device-abc-123', required: false })
  @Prop()
  deviceId: string;

  @ApiProperty({ example: '192.168.1.100', required: false })
  @Prop()
  ipAddress: string;

  @ApiProperty({ example: ['FAST_INTERVAL'], required: false })
  @Prop({ type: [String], default: [] })
  fraudFlags: string[];
}

export const AttendanceSchema = SchemaFactory.createForClass(Attendance);

AttendanceSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });
AttendanceSchema.index({ sessionId: 1, scanTime: -1 });
AttendanceSchema.index({ studentId: 1, scanTime: -1 });
