import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Speciality extends Document {
  @Prop({ required: true, unique: true })
  name: string;
}

export const SpecialitySchema = SchemaFactory.createForClass(Speciality);
