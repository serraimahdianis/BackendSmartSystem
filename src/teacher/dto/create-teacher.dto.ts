import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
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
    example: 'a.bouzid@univ-setif.dz',
    description: 'University email — must end with @univ-*.dz',
  })
  @IsEmail()
  @Matches(/@univ-[a-zA-Z0-9-]+\.dz$/, {
    message: 'Email must be a university email (e.g. @univ-setif.dz)',
  })
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
