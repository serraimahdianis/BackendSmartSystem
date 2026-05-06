import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class TeacherRegisterDto {
  @ApiProperty({ example: 'Dr. Ahmed Bouzid', description: 'Full name' })
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
