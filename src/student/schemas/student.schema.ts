import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type StudentDocument = HydratedDocument<Student>;

@Schema({ timestamps: true })
export class Student {
  @ApiProperty({ example: 'Amine Khelifi' })
  @Prop({ required: true })
  fullName: string;

  @ApiProperty({ example: 'amine.khelifi@student.dz' })
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @ApiProperty({
    example: '26062003',
    description: 'Birthday in DDMMYYYY format — used as default password',
  })
  @Prop({ required: true })
  birthday: string;

  @ApiProperty({ example: '1001' })
  @Prop({ required: true, unique: true })
  studentId: string;

  @ApiProperty({ example: 'RFID-0001-ABCD' })
  @Prop({ required: true, unique: true })
  rfidCode: string;

  @ApiProperty({ example: 'QR-0001-EFGH' })
  @Prop({ required: true, unique: true })
  qrCode: string;

  @ApiProperty({ example: 'https://example.com/face.jpg', required: false })
  @Prop()
  faceImage: string;

  @ApiProperty({ example: '2A' })
  @Prop({ required: true })
  group: string;

  @ApiProperty({ example: 'L2' })
  @Prop({ required: true })
  year: string;

  @ApiProperty({ example: 'Computer Science' })
  @Prop({ required: true })
  speciality: string;
}

export const StudentSchema = SchemaFactory.createForClass(Student);

StudentSchema.index({ group: 1, year: 1 });
StudentSchema.index({ speciality: 1 });
