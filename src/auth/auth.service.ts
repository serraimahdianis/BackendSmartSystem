import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Teacher, TeacherDocument } from '../teacher/schemas/teacher.schema';
import { Student, StudentDocument } from '../student/schemas/student.schema';
import { MailService } from './mail.service';
import { TeacherRegisterDto } from './dto/teacher-register.dto';
import { TeacherLoginDto } from './dto/teacher-login.dto';
import { StudentLoginDto } from './dto/student-login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Teacher.name) private teacherModel: Model<TeacherDocument>,
    @InjectModel(Student.name) private studentModel: Model<StudentDocument>,
    private jwtService: JwtService,
    private mailService: MailService,
    private configService: ConfigService,
  ) {}

  // ─── TEACHER REGISTRATION ────────────────────────────────
  async registerTeacher(dto: TeacherRegisterDto) {
    // Check if email already exists
    const existing = await this.teacherModel.findOne({ email: dto.email });
    if (existing) {
      throw new ConflictException('A teacher with this email already exists');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save teacher (not verified yet)
    const teacher = new this.teacherModel({
      fullName: dto.fullName,
      email: dto.email,
      password: hashedPassword,
      department: dto.department,
      isVerified: false,
      otp,
      otpExpires,
    });
    await teacher.save();

    // Send OTP email
    await this.mailService.sendOtp(dto.email, otp);

    return {
      message:
        'Registration successful. Please check your email for the OTP code.',
    };
  }

  // ─── VERIFY OTP ──────────────────────────────────────────
  async verifyOtp(dto: VerifyOtpDto) {
    const teacher = await this.teacherModel
      .findOne({ email: dto.email })
      .select('+otp +otpExpires')
      .exec();

    if (!teacher) {
      throw new UnauthorizedException('Teacher not found');
    }

    if (teacher.isVerified) {
      throw new BadRequestException('Account already verified');
    }

    if (!teacher.otp || teacher.otp !== dto.otp) {
      throw new UnauthorizedException('Invalid OTP code');
    }

    if (new Date() > teacher.otpExpires) {
      throw new UnauthorizedException(
        'OTP has expired. Please register again.',
      );
    }

    // Mark as verified and clear OTP fields
    teacher.isVerified = true;
    teacher.otp = undefined as unknown as string;
    teacher.otpExpires = undefined as unknown as Date;
    await teacher.save();

    // Issue JWT
    const payload = { sub: teacher._id, role: 'teacher' };
    return {
      message: 'Email verified successfully',
      access_token: this.jwtService.sign(payload),
      role: 'teacher',
    };
  }

  // ─── TEACHER LOGIN ───────────────────────────────────────
  async loginTeacher(dto: TeacherLoginDto) {
    const teacher = await this.teacherModel
      .findOne({ email: dto.email })
      .select('+password')
      .exec();

    if (!teacher) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!teacher.isVerified) {
      throw new UnauthorizedException(
        'Account not verified. Please check your email for the OTP.',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      teacher.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = { sub: teacher._id, role: 'teacher' };
    return {
      access_token: this.jwtService.sign(payload),
      role: 'teacher',
    };
  }

  // ─── STUDENT LOGIN ───────────────────────────────────────
  async loginStudent(dto: StudentLoginDto) {
    const student = await this.studentModel
      .findOne({ studentId: dto.studentId })
      .select('+password')
      .exec();

    if (!student) {
      throw new UnauthorizedException('Invalid student ID or password');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      student.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid student ID or password');
    }

    const payload = { sub: student._id, role: 'student' };
    return {
      access_token: this.jwtService.sign(payload),
      role: 'student',
    };
  }

  // ─── ADMIN LOGIN ─────────────────────────────────────────
  loginAdmin(email: string, password: string) {
    const adminEmail =
      this.configService.get<string>('ADMIN_EMAIL') || 'admin@admin.com';
    const adminPassword =
      this.configService.get<string>('ADMIN_PASSWORD') || 'admin123';

    if (email !== adminEmail || password !== adminPassword) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    const payload = { sub: 'admin', role: 'admin' };
    return {
      access_token: this.jwtService.sign(payload),
      role: 'admin',
    };
  }
}
