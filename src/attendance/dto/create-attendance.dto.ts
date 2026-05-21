import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsOptional, IsDateString, IsString } from 'class-validator';

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

  @ApiProperty({
    example: 'RFID',
    description: 'Scan method',
    enum: ['RFID', 'QR', 'MANUAL'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['RFID', 'QR', 'MANUAL'])
  method?: string;

  @ApiProperty({
    example: 'device-abc-123',
    description: 'Device identifier for fingerprinting',
    required: false,
  })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({
    example: '192.168.1.100',
    description: 'IP address of the scanning device',
    required: false,
  })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiProperty({
    example: 'a1b2c3d4e5f6a7b8',
    description: 'One-time nonce from QR code (optional, verified server-side)',
    required: false,
  })
  @IsOptional()
  nonce?: string;
}