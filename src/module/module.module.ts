import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AcademicModule, AcademicModuleSchema } from './schemas/module.schema';
import { ModuleService } from './module.service';
import { ModuleController } from './module.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AcademicModule.name, schema: AcademicModuleSchema },
    ]),
  ],
  controllers: [ModuleController],
  providers: [ModuleService],
  exports: [ModuleService],
})
export class AcademicModuleModule {}
