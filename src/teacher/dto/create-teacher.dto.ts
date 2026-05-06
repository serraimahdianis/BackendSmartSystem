import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateTeacherDto {
  @ApiProperty({
    example: 'Dr. Ahmed Bouzid',
    description: 'Full name of the teacher',
  })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({
    example: 'teacher@email.com',
    description: 'Teacher email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'StrongPassword123',
    description: 'Minimum 6 characters',
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    example: 'https://example.com/face.jpg',
    description: 'URL of the teacher face image',
    required: false,
  })
  @IsOptional()
  @IsString()
  faceImage?: string;

  @ApiProperty({ example: 'Computer Science', description: 'Department name' })
  @IsString()
  @IsNotEmpty()
  department: string;
}
