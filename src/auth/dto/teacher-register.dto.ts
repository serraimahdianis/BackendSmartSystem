import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class TeacherRegisterDto {
  @ApiProperty({ example: 'Dr. Ahmed Bouzid', description: 'Full name' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({
    example: 'a.bouzid@univ-setif.dz',
    description: 'Must be a university email',
  })
  @IsEmail()
  @Matches(/@univ-[a-zA-Z0-9-]+\.dz$/, {
    message: 'Email must be a university email (e.g. @univ-setif.dz)',
  })
  email: string;

  @ApiProperty({
    example: 'StrongPass123',
    description: 'Minimum 6 characters',
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Computer Science', description: 'Department' })
  @IsString()
  @IsNotEmpty()
  department: string;
}
