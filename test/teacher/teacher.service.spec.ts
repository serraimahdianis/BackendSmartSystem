import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { TeacherService } from '../../src/teacher/teacher.service';
import { Teacher } from '../../src/teacher/schemas/teacher.schema';

describe('TeacherService', () => {
  let service: TeacherService;
  let teacherModel: Record<string, jest.Mock>;

  const mockTeacher = {
    _id: '60d5ec49f1b2c72b9c8e4a1a',
    fullName: 'Dr. Ahmed Bouzid',
    email: 'a.bouzid@univ-setif.dz',
    department: 'Computer Science',
  };

  beforeEach(async () => {
    const saveMock = jest.fn().mockResolvedValue(mockTeacher);
    teacherModel = {
      constructor: jest.fn().mockImplementation(() => ({ save: saveMock })),
      find: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
    };

    // Make the model callable as a constructor
    const constructorFn = Object.assign(
      jest.fn().mockImplementation(() => ({ save: saveMock })),
      teacherModel,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeacherService,
        { provide: getModelToken(Teacher.name), useValue: constructorFn },
      ],
    }).compile();

    service = module.get<TeacherService>(TeacherService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════
  // CREATE
  // ═══════════════════════════════════════════════════════════

  describe('create', () => {
    it('should create and return a new teacher', async () => {
      const dto = {
        fullName: 'Dr. Ahmed Bouzid',
        email: 'a.bouzid@univ-setif.dz',
        password: 'StrongPass123',
        department: 'Computer Science',
      };

      const result = await service.create(dto);
      expect(result).toEqual(mockTeacher);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // FIND ALL
  // ═══════════════════════════════════════════════════════════

  describe('findAll', () => {
    it('should return an array of teachers', async () => {
      const teachers = [mockTeacher];
      teacherModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(teachers),
      });

      const result = await service.findAll();
      expect(result).toEqual(teachers);
      expect(teacherModel.find).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // FIND ONE
  // ═══════════════════════════════════════════════════════════

  describe('findOne', () => {
    it('should return a teacher when found', async () => {
      teacherModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTeacher),
      });

      const result = await service.findOne(mockTeacher._id);
      expect(result).toEqual(mockTeacher);
    });

    it('should throw NotFoundException when teacher not found', async () => {
      teacherModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════
  // FIND BY EMAIL
  // ═══════════════════════════════════════════════════════════

  describe('findByEmail', () => {
    it('should return a teacher when found by email', async () => {
      teacherModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTeacher),
      });

      const result = await service.findByEmail(mockTeacher.email);
      expect(result).toEqual(mockTeacher);
      expect(teacherModel.findOne).toHaveBeenCalledWith({
        email: mockTeacher.email,
      });
    });

    it('should throw NotFoundException when email not found', async () => {
      teacherModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.findByEmail('nonexistent@univ-setif.dz'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // UPDATE
  // ═══════════════════════════════════════════════════════════

  describe('update', () => {
    it('should update and return the teacher', async () => {
      const updatedTeacher = { ...mockTeacher, fullName: 'Dr. Updated Name' };
      teacherModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedTeacher),
      });

      const result = await service.update(mockTeacher._id, {
        fullName: 'Dr. Updated Name',
      });
      expect(result.fullName).toBe('Dr. Updated Name');
    });

    it('should throw NotFoundException when teacher to update not found', async () => {
      teacherModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.update('nonexistent-id', { fullName: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // REMOVE
  // ═══════════════════════════════════════════════════════════

  describe('remove', () => {
    it('should delete the teacher successfully', async () => {
      teacherModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTeacher),
      });

      await expect(service.remove(mockTeacher._id)).resolves.toBeUndefined();
    });

    it('should throw NotFoundException when teacher to delete not found', async () => {
      teacherModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.remove('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
