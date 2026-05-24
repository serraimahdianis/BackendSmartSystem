import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type TeacherDocument = HydratedDocument<Teacher>;

@Schema({ timestamps: true })
export class Teacher {
  @ApiProperty({ example: 'Dr. Ahmed Bouzid' })
  @Prop({ required: true })
  fullName: string;

  @ApiProperty({ example: 'teacher@email.com' })
  @Prop({
    required: true,
    unique: true,
  })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @ApiProperty({ example: 'https://example.com/face.jpg', required: false })
  @Prop()
  faceImage: string;

  @ApiProperty({ example: 'Computer Science' })
  @Prop({ required: true })
  department: string;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ select: false })
  otp: string;

  @Prop({ select: false })
  otpExpires: Date;
}

export const TeacherSchema = SchemaFactory.createForClass(Teacher);

TeacherSchema.index({ department: 1 });
TeacherSchema.index({ isVerified: 1 });
