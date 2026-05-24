import { Controller, Post, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { TeacherRegisterDto } from './dto/teacher-register.dto';
import { TeacherLoginDto } from './dto/teacher-login.dto';
import { StudentLoginDto } from './dto/student-login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@ApiTags('auth')
@Throttle({ default: { ttl: 60000, limit: 10 } })
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('teacher/register')
  @ApiOperation({ summary: 'Register a new teacher (sends OTP to email)' })
  @ApiResponse({ status: 201, description: 'OTP sent to email' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  registerTeacher(@Body() dto: TeacherRegisterDto) {
    return this.authService.registerTeacher(dto);
  }

  @Post('teacher/verify-otp')
  @ApiOperation({ summary: 'Verify teacher email with OTP code' })
  @ApiResponse({ status: 200, description: 'Email verified, JWT returned' })
  @ApiResponse({ status: 401, description: 'Invalid or expired OTP' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Post('teacher/login')
  @ApiOperation({ summary: 'Teacher login with email & password' })
  @ApiResponse({ status: 200, description: 'JWT returned' })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or not verified',
  })
  loginTeacher(@Body() dto: TeacherLoginDto) {
    return this.authService.loginTeacher(dto);
  }

  @Post('student/login')
  @ApiOperation({
    summary: 'Student login with student ID & birthday password',
  })
  @ApiResponse({ status: 200, description: 'JWT returned' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  loginStudent(@Body() dto: StudentLoginDto) {
    return this.authService.loginStudent(dto);
  }

  @Post('admin/login')
  @ApiOperation({ summary: 'Admin login' })
  @ApiResponse({ status: 200, description: 'JWT returned' })
  @ApiResponse({ status: 401, description: 'Invalid admin credentials' })
  loginAdmin(@Body() dto: TeacherLoginDto) {
    return this.authService.loginAdmin(dto.email, dto.password);
  }
}
