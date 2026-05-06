import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SessionService } from './session.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('sessions')
@ApiBearerAuth()
@Controller('sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post()
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Create a new session (regular or replacement)' })
  @ApiResponse({ status: 201, description: 'Session created successfully' })
  create(@Body() createSessionDto: CreateSessionDto) {
    return this.sessionService.create(createSessionDto);
  }

  @Post('start/:scheduleId')
  @Roles('teacher')
  @ApiOperation({ summary: 'Manually start a session from a mapped schedule' })
  @ApiResponse({
    status: 201,
    description: 'Active session started successfully',
  })
  @ApiResponse({ status: 409, description: 'Session already exists for today' })
  startSession(
    @Param('scheduleId') scheduleId: string,
    @Request() req: { user: { userId: string } },
  ) {
    const teacherId = req.user.userId;
    return this.sessionService.startSession(scheduleId, teacherId);
  }

  @Post(':id/end')
  @Roles('teacher')
  @ApiOperation({ summary: 'Manually end an active session' })
  @ApiResponse({ status: 200, description: 'Session ended successfully' })
  endSession(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
  ) {
    const teacherId = req.user.userId;
    return this.sessionService.endSession(id, teacherId);
  }

  @Get()
  @Roles('admin', 'teacher', 'student')
  @ApiOperation({ summary: 'Get all sessions (optionally filter by date)' })
  @ApiResponse({ status: 200, description: 'List of sessions' })
  @ApiQuery({ name: 'date', required: false, example: '2026-04-28' })
  findAll(@Query('date') date?: string) {
    if (date) {
      return this.sessionService.findByDate(date);
    }
    return this.sessionService.findAll();
  }

  @Get('teacher/:teacherId')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Get all sessions for a teacher' })
  @ApiResponse({ status: 200, description: 'Sessions for the given teacher' })
  findByTeacher(@Param('teacherId') teacherId: string) {
    return this.sessionService.findByTeacher(teacherId);
  }

  @Get(':id')
  @Roles('admin', 'teacher', 'student')
  @ApiOperation({ summary: 'Get a session by ID' })
  @ApiResponse({ status: 200, description: 'Session found' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  findOne(@Param('id') id: string) {
    return this.sessionService.findOne(id);
  }

  @Patch(':id/status')
  @Roles('admin', 'teacher')
  @ApiOperation({
    summary: 'Update session status (planned → active → closed)',
  })
  @ApiResponse({ status: 200, description: 'Session status updated' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.sessionService.updateStatus(id, status);
  }

  @Patch(':id')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Update a session' })
  @ApiResponse({ status: 200, description: 'Session updated successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  update(@Param('id') id: string, @Body() updateSessionDto: UpdateSessionDto) {
    return this.sessionService.update(id, updateSessionDto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a session (Admin only)' })
  @ApiResponse({ status: 200, description: 'Session deleted successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  remove(@Param('id') id: string) {
    return this.sessionService.remove(id);
  }
}
