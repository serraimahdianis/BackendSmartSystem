import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { StudentService } from '../student/student.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

interface User {
  userId: string;
  role: string;
}

interface RequestWithUser {
  user: User;
}

@ApiTags('attendance')
@ApiBearerAuth()
@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly studentService: StudentService,
  ) {}

  @Post('scan')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Record a student scan (RFID/QR attendance)' })
  @ApiResponse({ status: 201, description: 'Attendance recorded successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  recordScan(@Body() createAttendanceDto: CreateAttendanceDto) {
    return this.attendanceService.recordScan(createAttendanceDto);
  }

  @Get('session/:sessionId')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Get all attendance records for a session' })
  @ApiResponse({ status: 200, description: 'Attendance list for the session' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  findBySession(
    @Param('sessionId') sessionId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    page = Number(page) || 1;
    limit = Math.min(Number(limit) || 20, 100);
    return this.attendanceService.findBySession(sessionId, page, limit);
  }

  @Get('student/:studentId')
  @Roles('admin', 'teacher', 'student')
  @ApiOperation({ summary: 'Get all attendance records for a student' })
  @ApiResponse({
    status: 200,
    description: 'Attendance history for the student',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async findByStudent(
    @Param('studentId') studentId: string,
    @Req() req: RequestWithUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    page = Number(page) || 1;
    limit = Math.min(Number(limit) || 20, 100);

    if (req.user.role === 'teacher') {
      const allowed = await this.studentService.isAssignedToTeacher(
        studentId,
        req.user.userId,
      );
      if (!allowed) {
        throw new ForbiddenException(
          'You do not have permission to access this student attendance.',
        );
      }
    }
    return this.attendanceService.findByStudent(studentId, page, limit);
  }

  @Get('stats')
  @Roles('admin', 'teacher', 'student')
  @ApiOperation({ summary: 'Get attendance statistics' })
  @ApiQuery({
    name: 'studentId',
    required: false,
    description:
      'Filter stats for a specific student (MongoDB _id). Students always get their own stats regardless of this parameter.',
  })
  @ApiResponse({ status: 200, description: 'Attendance statistics' })
  async getStats(
    @Req() req: RequestWithUser,
    @Query('studentId') studentId?: string,
  ) {
    // 1. If logged in as student, enforce filtering by their own userId from token
    if (req.user && req.user.role === 'student') {
      return this.attendanceService.getStats(req.user.userId);
    }

    // 2. If logged in as teacher and providing a studentId, check permissions
    if (req.user && req.user.role === 'teacher' && studentId) {
      const allowed = await this.studentService.isAssignedToTeacher(
        studentId,
        req.user.userId,
      );
      if (!allowed) {
        throw new ForbiddenException(
          'You do not have permission to access statistics for this student.',
        );
      }
    }

    return this.attendanceService.getStats(studentId);
  }

  @Get(':id')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Get a single attendance record by ID' })
  @ApiResponse({ status: 200, description: 'Attendance record found' })
  @ApiResponse({ status: 404, description: 'Attendance record not found' })
  findOne(@Param('id') id: string) {
    return this.attendanceService.findOne(id);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete an attendance record (Admin only)' })
  @ApiResponse({ status: 200, description: 'Attendance record deleted' })
  @ApiResponse({ status: 404, description: 'Attendance record not found' })
  remove(@Param('id') id: string) {
    return this.attendanceService.remove(id);
  }
}
