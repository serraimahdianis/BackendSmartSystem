import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MetadataController } from './metadata.controller';
import { MetadataService } from './metadata.service';
import { Group, GroupSchema } from './schemas/group.schema';
import { Speciality, SpecialitySchema } from './schemas/speciality.schema';
import { Year, YearSchema } from './schemas/year.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Group.name, schema: GroupSchema },
      { name: Speciality.name, schema: SpecialitySchema },
      { name: Year.name, schema: YearSchema },
    ]),
  ],
  controllers: [MetadataController],
  providers: [MetadataService],
  exports: [MetadataService],
})
export class MetadataModule {}
