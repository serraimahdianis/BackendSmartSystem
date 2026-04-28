import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Teacher } from '../../teacher/schemas/teacher.schema';

export type ModuleDocument = HydratedDocument<AcademicModule>;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class AcademicModule {
  @ApiProperty({ example: 'NodeJS' })
  @Prop({ required: true })
  name: string;

  @ApiProperty({ example: '60d5ec49f1b2c72b9c8e4a1a' })
  @Prop({ type: Types.ObjectId, ref: Teacher.name, required: true })
  teacherId: Types.ObjectId;

  @ApiProperty({ example: 'L2' })
  @Prop({ required: true })
  year: string;
}

export const AcademicModuleSchema =
  SchemaFactory.createForClass(AcademicModule);
