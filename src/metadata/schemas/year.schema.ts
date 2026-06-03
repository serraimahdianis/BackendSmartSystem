import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Year extends Document {
  @Prop({ required: true, unique: true })
  name: string;
}

export const YearSchema = SchemaFactory.createForClass(Year);
