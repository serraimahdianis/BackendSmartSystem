import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AntiFraudService } from './anti-fraud.service';
import { FraudEvent, FraudEventSchema } from './fraud-event.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FraudEvent.name, schema: FraudEventSchema },
    ]),
  ],
  providers: [AntiFraudService],
  exports: [AntiFraudService],
})
export class AntiFraudModule {}
