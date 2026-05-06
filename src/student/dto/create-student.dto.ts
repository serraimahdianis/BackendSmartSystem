import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreateStudentDto {
  @ApiProperty({
    example: 'Amine Khelifi',
    description: 'Full name of the student',
  })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({
    example: 'amine.khelifi@student.dz',
    description: 'Student email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '26062003',
    description: 'Birthday in DDMMYYYY format — auto-generates password',
  })
  @IsString()
  @Matches(/^\d{8}$/, {
    message: 'Birthday must be exactly 8 digits in DDMMYYYY format',
  })
  birthday: string;

  @ApiProperty({
    example: '1001',
    description: 'Numeric university student ID (digits only, no prefixes)',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+$/, { message: 'studentId must contain only digits' })
  studentId: string;

  @ApiProperty({
    example: 'RFID-0001-ABCD',
    description: 'Unique RFID card code',
  })
  @IsString()
  @IsNotEmpty()
  rfidCode: string;

  @ApiProperty({
    example: 'QR-0001-EFGH',
    description: 'Unique QR code (fallback)',
  })
  @IsString()
  @IsNotEmpty()
  qrCode: string;

  @ApiProperty({
    example: 'https://example.com/face.jpg',
    description: 'URL of the student face image',
    required: false,
  })
  @IsOptional()
  @IsString()
  faceImage?: string;

  @ApiProperty({ example: '2A', description: 'Student group (e.g. 2A, 1B)' })
  @IsString()
  @IsNotEmpty()
  group: string;

  @ApiProperty({
    example: 'L2',
    description: 'Academic year (e.g. L1, L2, L3, M1, M2)',
  })
  @IsString()
  @IsNotEmpty()
  year: string;

  @ApiProperty({
    example: 'Computer Science',
    description: 'Student speciality',
  })
  @IsString()
  @IsNotEmpty()
  speciality: string;
}
