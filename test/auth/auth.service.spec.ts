import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../../src/auth/auth.service';
import { MailService } from '../../src/auth/mail.service';
import { Teacher } from '../../src/teacher/schemas/teacher.schema';
import { Student } from '../../src/student/schemas/student.schema';

// ─── Mock bcrypt ─────────────────────────────────────────
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let teacherModel: Record<string, jest.Mock>;
  let studentModel: Record<string, jest.Mock>;
  let jwtService: { sign: jest.Mock };
  let mailService: { sendOtp: jest.Mock };
  let configService: { get: jest.Mock };

  // Helper: create a saveable mock document
  const mockTeacherDoc = (overrides = {}) => ({
    _id: '60d5ec49f1b2c72b9c8e4a1a',
    fullName: 'Dr. Ahmed Bouzid',
    email: 'a.bouzid@univ-setif.dz',
    password: 'hashedPassword123',
    department: 'Computer Science',
    isVerified: false,
    otp: '123456',
    otpExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 min from now
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  beforeEach(async () => {
    // Reset all mocks
    teacherModel = {
      findOne: jest.fn(),
      constructor: jest.fn(),
    };
    studentModel = {
      findOne: jest.fn(),
    };
    jwtService = { sign: jest.fn().mockReturnValue('mock-jwt-token') };
    mailService = { sendOtp: jest.fn().mockResolvedValue(undefined) };
    configService = {
      get: jest.fn((key: string) => {
        const env: Record<string, string> = {
          ADMIN_EMAIL: 'admin@admin.com',
          ADMIN_PASSWORD: 'admin123',
        };
        return env[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getModelToken(Teacher.name), useValue: teacherModel },
        { provide: getModelToken(Student.name), useValue: studentModel },
        { provide: JwtService, useValue: jwtService },
        { provide: MailService, useValue: mailService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════
  // TEACHER REGISTRATION
  // ═══════════════════════════════════════════════════════════

  describe('registerTeacher', () => {
    const dto = {
      fullName: 'Dr. Ahmed Bouzid',
      email: 'a.bouzid@univ-setif.dz',
      password: 'StrongPass123',
      department: 'Computer Science',
    };

    it('should register a new teacher and send OTP email', async () => {
      teacherModel.findOne.mockResolvedValue(null); // no existing teacher
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');

      // Mock the constructor (new this.teacherModel(...)) by making the model callable
      const saveMock = jest.fn().mockResolvedValue(undefined);
      const modelInstance = { save: saveMock };
      // Override the provider to be a constructable function
      const constructorFn = Object.assign(
        jest.fn().mockImplementation(() => modelInstance),
        { findOne: teacherModel.findOne },
      );
      Object.defineProperty(service, 'teacherModel', { value: constructorFn });

      const result = await service.registerTeacher(dto);

      expect(constructorFn.findOne).toHaveBeenCalledWith({
        email: dto.email,
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 10);
      expect(saveMock).toHaveBeenCalled();
      expect(mailService.sendOtp).toHaveBeenCalledWith(
        dto.email,
        expect.any(String),
      );
      expect(result).toEqual({
        message:
          'Registration successful. Please check your email for the OTP code.',
      });
    });

    it('should throw ConflictException if email already exists', async () => {
      teacherModel.findOne.mockResolvedValue(mockTeacherDoc());

      await expect(service.registerTeacher(dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════
  // VERIFY OTP
  // ═══════════════════════════════════════════════════════════

  describe('verifyOtp', () => {
    const dto = { email: 'a.bouzid@univ-setif.dz', otp: '123456' };

    // Helper for chained query: .findOne().select().exec()
    const chainedQuery = (result: any) => ({
      select: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(result),
      }),
    });

    it('should verify OTP and return JWT token', async () => {
      const teacher = mockTeacherDoc();
      teacherModel.findOne.mockReturnValue(chainedQuery(teacher));

      const result = await service.verifyOtp(dto);

      expect(teacher.isVerified).toBe(true);
      expect(teacher.otp).toBeUndefined();
      expect(teacher.otpExpires).toBeUndefined();
      expect(teacher.save).toHaveBeenCalled();
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: teacher._id,
        role: 'teacher',
      });
      expect(result).toEqual({
        message: 'Email verified successfully',
        access_token: 'mock-jwt-token',
        role: 'teacher',
      });
    });

    it('should throw UnauthorizedException if teacher not found', async () => {
      teacherModel.findOne.mockReturnValue(chainedQuery(null));

      await expect(service.verifyOtp(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw BadRequestException if already verified', async () => {
      const teacher = mockTeacherDoc({ isVerified: true });
      teacherModel.findOne.mockReturnValue(chainedQuery(teacher));

      await expect(service.verifyOtp(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException for wrong OTP code', async () => {
      const teacher = mockTeacherDoc({ otp: '999999' });
      teacherModel.findOne.mockReturnValue(chainedQuery(teacher));

      await expect(service.verifyOtp(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for expired OTP', async () => {
      const teacher = mockTeacherDoc({
        otpExpires: new Date(Date.now() - 60 * 1000), // expired 1 minute ago
      });
      teacherModel.findOne.mockReturnValue(chainedQuery(teacher));

      await expect(service.verifyOtp(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════
  // TEACHER LOGIN
  // ═══════════════════════════════════════════════════════════

  describe('loginTeacher', () => {
    const dto = { email: 'a.bouzid@univ-setif.dz', password: 'StrongPass123' };

    const chainedQuery = (result: any) => ({
      select: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(result),
      }),
    });

    it('should return JWT for valid credentials', async () => {
      const teacher = mockTeacherDoc({ isVerified: true });
      teacherModel.findOne.mockReturnValue(chainedQuery(teacher));
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.loginTeacher(dto);

      expect(result).toEqual({
        access_token: 'mock-jwt-token',
        role: 'teacher',
      });
    });

    it('should throw UnauthorizedException for wrong email', async () => {
      teacherModel.findOne.mockReturnValue(chainedQuery(null));

      await expect(service.loginTeacher(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if not verified', async () => {
      const teacher = mockTeacherDoc({ isVerified: false });
      teacherModel.findOne.mockReturnValue(chainedQuery(teacher));

      await expect(service.loginTeacher(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      const teacher = mockTeacherDoc({ isVerified: true });
      teacherModel.findOne.mockReturnValue(chainedQuery(teacher));
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.loginTeacher(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════
  // STUDENT LOGIN
  // ═══════════════════════════════════════════════════════════

  describe('loginStudent', () => {
    const dto = { studentId: 'ST1001', password: '26062003' };

    const chainedQuery = (result: any) => ({
      select: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(result),
      }),
    });

    it('should return JWT for valid student credentials', async () => {
      const student = {
        _id: '60d5ec49f1b2c72b9c8e4a1e',
        studentId: 'ST1001',
        password: 'hashedBirthday',
      };
      studentModel.findOne.mockReturnValue(chainedQuery(student));
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.loginStudent(dto);

      expect(result).toEqual({
        access_token: 'mock-jwt-token',
        role: 'student',
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: student._id,
        role: 'student',
      });
    });

    it('should throw UnauthorizedException for wrong student ID', async () => {
      studentModel.findOne.mockReturnValue(chainedQuery(null));

      await expect(service.loginStudent(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════
  // ADMIN LOGIN
  // ═══════════════════════════════════════════════════════════

  describe('loginAdmin', () => {
    it('should return JWT for valid admin credentials', () => {
      const result = service.loginAdmin('admin@admin.com', 'admin123');

      expect(result).toEqual({
        access_token: 'mock-jwt-token',
        role: 'admin',
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'admin',
        role: 'admin',
      });
    });

    it('should throw UnauthorizedException for invalid admin credentials', () => {
      expect(() => service.loginAdmin('wrong@email.com', 'wrongpass')).toThrow(
        UnauthorizedException,
      );
    });
  });
});
