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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('attendance')
@ApiBearerAuth()
@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

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
  findBySession(@Param('sessionId') sessionId: string) {
    return this.attendanceService.findBySession(sessionId);
  }

  @Get('student/:studentId')
  @Roles('admin', 'teacher', 'student')
  @ApiOperation({ summary: 'Get all attendance records for a student' })
  @ApiResponse({
    status: 200,
    description: 'Attendance history for the student',
  })
  findByStudent(@Param('studentId') studentId: string) {
    return this.attendanceService.findByStudent(studentId);
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
  getStats(@Req() req: any, @Query('studentId') studentId?: string) {
    // If logged in as student, enforce filtering by their own userId from token
    if (req.user && req.user.role === 'student') {
      return this.attendanceService.getStats(req.user.userId);
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
