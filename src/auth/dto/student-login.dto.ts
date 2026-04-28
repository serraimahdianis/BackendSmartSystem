import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class StudentLoginDto {
  @ApiProperty({ example: 'ST1001', description: 'University student ID' })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({
    example: '26062003',
    description: 'Birthday in DDMMYYYY format',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
