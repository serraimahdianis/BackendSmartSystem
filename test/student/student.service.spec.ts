import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { StudentService } from '../../src/student/student.service';
import { Student } from '../../src/student/schemas/student.schema';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('StudentService', () => {
  let service: StudentService;
  let studentModel: Record<string, jest.Mock>;
  let saveMock: jest.Mock;

  const mockStudent = {
    _id: '60d5ec49f1b2c72b9c8e4a1e',
    fullName: 'Amine Khelifi',
    email: 'amine.khelifi@student.dz',
    birthday: '26062003',
    studentId: 'ST1001',
    rfidCode: 'RFID-0001-ABCD',
    qrCode: 'QR-0001-EFGH',
    group: '2A',
    year: 'L2',
    speciality: 'Computer Science',
    password: 'hashedBirthdayPassword',
  };

  beforeEach(async () => {
    saveMock = jest.fn().mockResolvedValue(mockStudent);
    studentModel = {
      find: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
    };

    const constructorFn = Object.assign(
      jest.fn().mockImplementation(() => ({ save: saveMock })),
      studentModel,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentService,
        { provide: getModelToken(Student.name), useValue: constructorFn },
      ],
    }).compile();

    service = module.get<StudentService>(StudentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════
  // CREATE — auto-generates hashed password from birthday
  // ═══════════════════════════════════════════════════════════

  describe('create', () => {
    const dto = {
      fullName: 'Amine Khelifi',
      email: 'amine.khelifi@student.dz',
      birthday: '26062003',
      studentId: 'ST1001',
      rfidCode: 'RFID-0001-ABCD',
      qrCode: 'QR-0001-EFGH',
      group: '2A',
      year: 'L2',
      speciality: 'Computer Science',
    };

    it('should hash birthday as password and create student', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedBirthdayPassword');

      const result = await service.create(dto);

      expect(bcrypt.hash).toHaveBeenCalledWith('26062003', 10);
      expect(saveMock).toHaveBeenCalled();
      expect(result).toEqual(mockStudent);
    });

    it('should NOT store password in plain text', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$randomHashedValue');

      await service.create(dto);

      const hashResult = (bcrypt.hash as jest.Mock).mock.results[0]
        .value as string;
      expect(hashResult).not.toBe(dto.birthday);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // FIND ALL
  // ═══════════════════════════════════════════════════════════

  describe('findAll', () => {
    it('should return an array of students', async () => {
      const students = [mockStudent];
      studentModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(students),
      });

      const result = await service.findAll();
      expect(result).toEqual(students);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // FIND ONE
  // ═══════════════════════════════════════════════════════════

  describe('findOne', () => {
    it('should return a student when found', async () => {
      studentModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockStudent),
      });

      const result = await service.findOne(mockStudent._id);
      expect(result).toEqual(mockStudent);
    });

    it('should throw NotFoundException when student not found', async () => {
      studentModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════
  // FIND BY RFID — simulates RFID scanner lookup
  // ═══════════════════════════════════════════════════════════

  describe('findByRfid', () => {
    it('should return a student when RFID code matches', async () => {
      studentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockStudent),
      });

      const result = await service.findByRfid('RFID-0001-ABCD');
      expect(result).toEqual(mockStudent);
      expect(studentModel.findOne).toHaveBeenCalledWith({
        rfidCode: 'RFID-0001-ABCD',
      });
    });

    it('should throw NotFoundException when RFID code not found', async () => {
      studentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findByRfid('UNKNOWN-RFID')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════
  // FIND BY GROUP
  // ═══════════════════════════════════════════════════════════

  describe('findByGroup', () => {
    it('should return students filtered by group and year', async () => {
      const students = [mockStudent];
      studentModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(students),
      });

      const result = await service.findByGroup('2A', 'L2');
      expect(result).toEqual(students);
      expect(studentModel.find).toHaveBeenCalledWith({
        group: '2A',
        year: 'L2',
      });
    });
  });

  // ═══════════════════════════════════════════════════════════
  // UPDATE
  // ═══════════════════════════════════════════════════════════

  describe('update', () => {
    it('should update and return the student', async () => {
      const updatedStudent = { ...mockStudent, group: '3B' };
      studentModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedStudent),
      });

      const result = await service.update(mockStudent._id, { group: '3B' });
      expect(result.group).toBe('3B');
    });

    it('should throw NotFoundException when student to update not found', async () => {
      studentModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.update('nonexistent-id', { group: '3B' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // REMOVE
  // ═══════════════════════════════════════════════════════════

  describe('remove', () => {
    it('should delete the student successfully', async () => {
      studentModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockStudent),
      });

      await expect(service.remove(mockStudent._id)).resolves.toBeUndefined();
    });

    it('should throw NotFoundException when student to delete not found', async () => {
      studentModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.remove('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
