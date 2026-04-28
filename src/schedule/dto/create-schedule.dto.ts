import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreateScheduleDto {
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

  @ApiProperty({ example: 'td', enum: ['cours', 'td', 'tp'] })
  @IsEnum(['cours', 'td', 'tp'], { message: 'type must be cours, td, or tp' })
  type: string;

  @ApiProperty({ example: 'L2', enum: ['L1', 'L2', 'L3', 'M1', 'M2'] })
  @IsEnum(['L1', 'L2', 'L3', 'M1', 'M2'], {
    message: 'year must be L1, L2, L3, M1, or M2',
  })
  year: string;

  @ApiProperty({
    example: '2A',
    description: 'Group (null if cours)',
    required: false,
  })
  @IsOptional()
  @IsString()
  group?: string;

  @ApiProperty({
    example: 'Sunday',
    enum: [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ],
  })
  @IsEnum(
    [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ],
    {
      message: 'dayOfWeek must be a valid day name (e.g. Sunday)',
    },
  )
  dayOfWeek: string;

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

  @ApiProperty({ example: 'Room A101', description: 'Room identifier' })
  @IsString()
  @IsNotEmpty()
  room: string;
}
