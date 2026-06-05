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

  @ApiProperty({ example: '60d5ec49f1b2c72b9c8e4a1a', required: false })
  @Prop({ type: Types.ObjectId, ref: 'Teacher', default: null })
  teacherId: Types.ObjectId;

  @ApiProperty({ example: 'L2', required: false })
  @Prop({ default: null })
  year: string;
}

export const AcademicModuleSchema =
  SchemaFactory.createForClass(AcademicModule);

AcademicModuleSchema.index({ teacherId: 1 });
AcademicModuleSchema.index({ year: 1, name: 1 });
