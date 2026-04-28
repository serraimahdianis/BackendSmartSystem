import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class CreateModuleDto {
  @ApiProperty({
    example: 'NodeJS',
    description: 'Name of the academic module/subject',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: '60d5ec49f1b2c72b9c8e4a1a',
    description: 'Teacher ID (MongoDB ObjectId)',
  })
  @IsMongoId()
  teacherId: string;

  @ApiProperty({
    example: 'L2',
    description: 'Academic year (L1, L2, L3, M1, M2)',
  })
  @IsString()
  @IsNotEmpty()
  year: string;
}
