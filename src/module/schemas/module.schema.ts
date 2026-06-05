import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type ModuleDocument = HydratedDocument<AcademicModule>;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class AcademicModule {
  @ApiProperty({ example: 'NodeJS' })
  @Prop({ required: true })
  name: string;
}

export const AcademicModuleSchema =
  SchemaFactory.createForClass(AcademicModule);

AcademicModuleSchema.index({ name: 1 }, { unique: true });
