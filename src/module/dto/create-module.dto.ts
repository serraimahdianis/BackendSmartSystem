import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator';

export class CreateModuleDto {
  @ApiProperty({
    example: 'NodeJS',
    description:
      'Name of the academic module/subject (e.g., NodeJS, Mathematics, Databases)',
    type: 'string',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: '60d5ec49f1b2c72b9c8e4a1a',
    description:
      'Teacher ID (valid MongoDB ObjectId) who will be assigned to teach this module',
    type: 'string',
    required: false,
    format: 'ObjectId',
  })
  @IsOptional()
  @IsMongoId()
  teacherId?: string;

  @ApiProperty({
    example: 'L2',
    description:
      'Academic year level: L1 (First year License), L2 (Second year License), L3 (Third year License), M1 (First year Master), M2 (Second year Master)',
    enum: ['L1', 'L2', 'L3', 'M1', 'M2'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['L1', 'L2', 'L3', 'M1', 'M2'])
  year?: string;
}
