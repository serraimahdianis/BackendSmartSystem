import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreateSessionDto {
  @ApiProperty({
    example: '60d5ec49f1b2c72b9c8e4a1c',
    description: 'Schedule ID (null if replacement)',
    required: false,
  })
  @IsOptional()
  @IsMongoId()
  scheduleId?: string;

  @ApiProperty({
    example: '60d5ec49f1b2c72b9c8e4a1a',
    description: 'Teacher ID',
  })
  @IsMongoId()
  teacherId: string;

  @ApiProperty({
    example: '60d5ec49f1b2c72b9c8e4a1b',
    description: 'Module ID',
  })
  @IsMongoId()
  moduleId: string;

  @ApiProperty({
    example: '2026-04-28',
    description: 'Date of the session (ISO format)',
  })
  @IsDateString()
  date: string;

  @ApiProperty({ example: '08:00', description: 'Start time (HH:MM)' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime must be in HH:MM format',
  })
  startTime: string;

  @ApiProperty({ example: '09:30', description: 'End time (HH:MM)' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endTime must be in HH:MM format',
  })
  endTime: string;

  @ApiProperty({ example: 'td', enum: ['cours', 'td', 'tp'] })
  @IsEnum(['cours', 'td', 'tp'])
  type: string;

  @ApiProperty({ example: '2A', required: false })
  @IsOptional()
  @IsString()
  group?: string;

  @ApiProperty({ example: 'Computer Science', required: false })
  @IsOptional()
  @IsString()
  speciality?: string;

  @ApiProperty({
    example: 'L2',
    enum: ['L1', 'L2', 'L3', 'M1', 'M2'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['L1', 'L2', 'L3', 'M1', 'M2'])
  year?: string;

  @ApiProperty({
    example: 'planned',
    enum: ['planned', 'active', 'closed', 'canceled'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['planned', 'active', 'closed', 'canceled'])
  status?: string;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isReplacement?: boolean;

  @ApiProperty({ example: 'Teacher was sick on Sunday', required: false })
  @IsOptional()
  @IsString()
  reasonForReplacement?: string;
}
