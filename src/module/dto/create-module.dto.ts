import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateModuleDto {
  @ApiProperty({
    example: 'NodeJS',
    description:
      'Name of the academic module/subject (e.g., NodeJS, Mathematics, Databases)',
    type: 'string',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}
