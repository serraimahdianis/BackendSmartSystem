import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type FraudEventDocument = HydratedDocument<FraudEvent>;

export type FraudReasonCode =
  | 'DUPLICATE_SCAN'
  | 'FAST_INTERVAL'
  | 'VELOCITY_ANOMALY'
  | 'REPLAY_ATTEMPT'
  | 'RELAY_ATTACK'
  | 'SUSPICIOUS_SCORE';

@Schema({ timestamps: true })
export class FraudEvent {
  @Prop({ required: true, index: true })
  sessionId: string;

  @Prop({ required: false })
  studentId: string;

  @Prop({ required: true, enum: [
    'DUPLICATE_SCAN',
    'FAST_INTERVAL',
    'VELOCITY_ANOMALY',
    'REPLAY_ATTEMPT',
    'RELAY_ATTACK',
    'SUSPICIOUS_SCORE',
  ]})
  reasonCode: FraudReasonCode;

  @Prop({ required: true })
  description: string;

  @Prop({ type: Types.Map, of: Object, default: {} })
  metadata: Record<string, any>;

  @Prop({ default: 0 })
  riskScore: number;
}

export const FraudEventSchema = SchemaFactory.createForClass(FraudEvent);

FraudEventSchema.index({ sessionId: 1, createdAt: -1 });
FraudEventSchema.index({ studentId: 1 });
FraudEventSchema.index({ reasonCode: 1 });
