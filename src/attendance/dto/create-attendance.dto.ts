import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsOptional, IsDateString } from 'class-validator';

export class CreateAttendanceDto {
  @ApiProperty({
    example: '60d5ec49f1b2c72b9c8e4a1d',
    description: 'Session ID',
  })
  @IsMongoId()
  sessionId: string;

  @ApiProperty({
    example: '60d5ec49f1b2c72b9c8e4a1e',
    description: 'Student ID',
  })
  @IsMongoId()
  studentId: string;

  @ApiProperty({ example: 'present', enum: ['present', 'late', 'absent'] })
  @IsEnum(['present', 'late', 'absent'], {
    message: 'status must be present, late, or absent',
  })
  status: string;

  @ApiProperty({
    example: '2026-04-28T08:05:00.000Z',
    description: 'Timestamp when the card was scanned',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  scanTime?: string;
}
