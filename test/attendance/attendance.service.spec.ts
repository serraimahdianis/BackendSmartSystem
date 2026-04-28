import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { AttendanceService } from '../../src/attendance/attendance.service';
import { Attendance } from '../../src/attendance/schemas/attendance.schema';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let attendanceModel: Record<string, jest.Mock>;

  const mockAttendance = {
    _id: '60d5ec49f1b2c72b9c8e4a1f',
    sessionId: '60d5ec49f1b2c72b9c8e4a1d',
    studentId: '60d5ec49f1b2c72b9c8e4a1e',
    status: 'present',
    scanTime: new Date('2026-04-28T08:05:00.000Z'),
  };

  // Helper for single populate chain
  const chainedSinglePopulate = (result: any) => ({
    populate: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(result),
    }),
  });

  // Helper for double populate chain
  const chainedDoublePopulate = (result: any) => ({
    populate: jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(result),
      }),
    }),
  });

  beforeEach(async () => {
    const saveMock = jest.fn().mockResolvedValue(mockAttendance);
    attendanceModel = {
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndDelete: jest.fn(),
    };

    const constructorFn = Object.assign(
      jest.fn().mockImplementation(() => ({ save: saveMock })),
      attendanceModel,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        {
          provide: getModelToken(Attendance.name),
          useValue: constructorFn,
        },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════
  // RECORD SCAN — RFID attendance recording
  // ═══════════════════════════════════════════════════════════

  describe('recordScan', () => {
    it('should record attendance and return the saved record', async () => {
      const dto = {
        sessionId: '60d5ec49f1b2c72b9c8e4a1d',
        studentId: '60d5ec49f1b2c72b9c8e4a1e',
        status: 'present',
        scanTime: '2026-04-28T08:05:00.000Z',
      };

      const result = await service.recordScan(dto);
      expect(result).toEqual(mockAttendance);
    });

    it('should auto-set scanTime to current time when not provided', async () => {
      const dto: Record<string, string> = {
        sessionId: '60d5ec49f1b2c72b9c8e4a1d',
        studentId: '60d5ec49f1b2c72b9c8e4a1e',
        status: 'present',
      };

      // Before calling, scanTime is undefined
      expect(dto['scanTime']).toBeUndefined();

      await service.recordScan(
        dto as unknown as Parameters<typeof service.recordScan>[0],
      );

      // After calling, scanTime should have been set
      expect(dto['scanTime']).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // FIND BY SESSION — get all scans for a class session
  // ═══════════════════════════════════════════════════════════

  describe('findBySession', () => {
    it('should return attendance records for a session', async () => {
      const records = [mockAttendance];
      attendanceModel.find.mockReturnValue(chainedSinglePopulate(records));

      const result = await service.findBySession('60d5ec49f1b2c72b9c8e4a1d');
      expect(result).toEqual(records);
      expect(attendanceModel.find).toHaveBeenCalledWith({
        sessionId: '60d5ec49f1b2c72b9c8e4a1d',
      });
    });
  });

  // ═══════════════════════════════════════════════════════════
  // FIND BY STUDENT — student's attendance history
  // ═══════════════════════════════════════════════════════════

  describe('findByStudent', () => {
    it('should return attendance history for a student', async () => {
      const records = [mockAttendance];
      attendanceModel.find.mockReturnValue(chainedSinglePopulate(records));

      const result = await service.findByStudent('60d5ec49f1b2c72b9c8e4a1e');
      expect(result).toEqual(records);
      expect(attendanceModel.find).toHaveBeenCalledWith({
        studentId: '60d5ec49f1b2c72b9c8e4a1e',
      });
    });
  });

  // ═══════════════════════════════════════════════════════════
  // FIND ONE
  // ═══════════════════════════════════════════════════════════

  describe('findOne', () => {
    it('should return an attendance record when found', async () => {
      attendanceModel.findById.mockReturnValue(
        chainedDoublePopulate(mockAttendance),
      );

      const result = await service.findOne(mockAttendance._id);
      expect(result).toEqual(mockAttendance);
    });

    it('should throw NotFoundException when record not found', async () => {
      attendanceModel.findById.mockReturnValue(chainedDoublePopulate(null));

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════
  // REMOVE
  // ═══════════════════════════════════════════════════════════

  describe('remove', () => {
    it('should delete the attendance record successfully', async () => {
      attendanceModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAttendance),
      });

      await expect(service.remove(mockAttendance._id)).resolves.toBeUndefined();
    });

    it('should throw NotFoundException when record to delete not found', async () => {
      attendanceModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.remove('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
