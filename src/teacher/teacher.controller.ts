import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { TeacherService } from './teacher.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('teachers')
@ApiBearerAuth()
@Controller('teachers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Post()
  @Roles('admin')
  @ApiOperation({
    summary: 'Create a new teacher',
    description:
      'Creates a new teacher account. Requires admin role. Teacher will need to verify OTP sent to their university email before activation.',
  })
  @ApiCreatedResponse({
    description: 'Teacher created successfully',
    type: CreateTeacherDto,
  })
  @ApiBadRequestResponse({
    description:
      'Validation error (e.g., invalid email format, missing required fields)',
  })
  @ApiUnauthorizedResponse({ description: 'JWT token is missing or invalid' })
  @ApiForbiddenResponse({
    description: 'User does not have the required role (admin only)',
  })
  @ApiBody({ type: CreateTeacherDto })
  create(@Body() createTeacherDto: CreateTeacherDto) {
    return this.teacherService.create(createTeacherDto);
  }

  @Get()
  @Roles('admin')
  @ApiOperation({
    summary: 'Get all teachers',
    description:
      'Retrieves a list of all teacher accounts. Requires admin role.',
  })
  @ApiOkResponse({
    description: 'List of all teachers retrieved successfully',
    type: [CreateTeacherDto],
  })
  @ApiUnauthorizedResponse({ description: 'JWT token is missing or invalid' })
  @ApiForbiddenResponse({
    description: 'User does not have the required role (admin only)',
  })
  findAll() {
    return this.teacherService.findAll();
  }

  @Get('me')
  @Roles('teacher')
  @ApiOperation({
    summary: 'Get current teacher profile',
    description:
      'Retrieves the profile of the currently authenticated teacher. Requires teacher role.',
  })
  @ApiOkResponse({
    description: 'Current teacher profile retrieved successfully',
    type: CreateTeacherDto,
  })
  @ApiNotFoundResponse({ description: 'Teacher not found' })
  @ApiUnauthorizedResponse({ description: 'JWT token is missing or invalid' })
  @ApiForbiddenResponse({
    description: 'User does not have the required role (teacher only)',
  })
  getProfile(@Req() req: Request) {
    const user = req.user as { userId: string; role: string };
    return this.teacherService.findOne(user.userId);
  }

  @Get(':id')
  @Roles('admin', 'teacher')
  @ApiOperation({
    summary: 'Get a teacher by ID',
    description:
      'Retrieves a teacher profile by their MongoDB ObjectId. Accessible by admin and teachers.',
  })
  @ApiParam({
    name: 'id',
    description: 'MongoDB ObjectId of the teacher',
    example: '60d5ec49f1b2c72b9c8e4a1a',
    type: 'string',
  })
  @ApiOkResponse({
    description: 'Teacher found and retrieved successfully',
    type: CreateTeacherDto,
  })
  @ApiNotFoundResponse({
    description: 'Teacher not found (invalid ID or teacher does not exist)',
  })
  @ApiBadRequestResponse({
    description:
      'Invalid teacher ID format (must be a valid 24-character hex string)',
  })
  @ApiUnauthorizedResponse({ description: 'JWT token is missing or invalid' })
  @ApiForbiddenResponse({
    description: 'User does not have the required role',
  })
  findOne(@Param('id') id: string) {
    return this.teacherService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({
    summary: 'Update a teacher',
    description:
      'Updates an existing teacher by their ID. Only provided fields will be updated. Requires admin role.',
  })
  @ApiParam({
    name: 'id',
    description: 'MongoDB ObjectId of the teacher to update',
    example: '60d5ec49f1b2c72b9c8e4a1a',
    type: 'string',
  })
  @ApiOkResponse({
    description: 'Teacher updated successfully',
    type: CreateTeacherDto,
  })
  @ApiNotFoundResponse({
    description: 'Teacher not found (invalid ID or teacher does not exist)',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or teacher ID format',
  })
  @ApiUnauthorizedResponse({ description: 'JWT token is missing or invalid' })
  @ApiForbiddenResponse({
    description: 'User does not have the required role (admin only)',
  })
  @ApiBody({ type: UpdateTeacherDto })
  update(@Param('id') id: string, @Body() updateTeacherDto: UpdateTeacherDto) {
    return this.teacherService.update(id, updateTeacherDto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({
    summary: 'Delete a teacher',
    description:
      'Permanently deletes a teacher by their ID. This action cannot be undone. Requires admin role.',
  })
  @ApiParam({
    name: 'id',
    description: 'MongoDB ObjectId of the teacher to delete',
    example: '60d5ec49f1b2c72b9c8e4a1a',
    type: 'string',
  })
  @ApiOkResponse({ description: 'Teacher deleted successfully' })
  @ApiNotFoundResponse({
    description: 'Teacher not found (invalid ID or teacher does not exist)',
  })
  @ApiBadRequestResponse({
    description:
      'Invalid teacher ID format (must be a valid 24-character hex string)',
  })
  @ApiUnauthorizedResponse({ description: 'JWT token is missing or invalid' })
  @ApiForbiddenResponse({
    description: 'User does not have the required role (admin only)',
  })
  remove(@Param('id') id: string) {
    return this.teacherService.remove(id);
  }
}
