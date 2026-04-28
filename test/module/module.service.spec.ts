import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { ModuleService } from '../../src/module/module.service';
import { AcademicModule } from '../../src/module/schemas/module.schema';

describe('ModuleService', () => {
  let service: ModuleService;
  let moduleModel: Record<string, jest.Mock>;

  const mockModule = {
    _id: '60d5ec49f1b2c72b9c8e4a1b',
    name: 'NodeJS',
    teacherId: '60d5ec49f1b2c72b9c8e4a1a',
    year: 'L2',
  };

  // Helper for chained .find().populate().exec()
  const chainedPopulate = (result: any) => ({
    populate: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(result),
    }),
  });

  // Helper for .findById().populate().exec()
  const chainedFindPopulate = (result: any) => ({
    populate: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(result),
    }),
  });

  beforeEach(async () => {
    const saveMock = jest.fn().mockResolvedValue(mockModule);
    moduleModel = {
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
    };

    const constructorFn = Object.assign(
      jest.fn().mockImplementation(() => ({ save: saveMock })),
      moduleModel,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModuleService,
        {
          provide: getModelToken(AcademicModule.name),
          useValue: constructorFn,
        },
      ],
    }).compile();

    service = module.get<ModuleService>(ModuleService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════
  // CREATE
  // ═══════════════════════════════════════════════════════════

  describe('create', () => {
    it('should create and return a new academic module', async () => {
      const dto = {
        name: 'NodeJS',
        teacherId: '60d5ec49f1b2c72b9c8e4a1a',
        year: 'L2',
      };

      const result = await service.create(dto);
      expect(result).toEqual(mockModule);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // FIND ALL — with teacher populate
  // ═══════════════════════════════════════════════════════════

  describe('findAll', () => {
    it('should return all modules with populated teacher info', async () => {
      const modules = [mockModule];
      moduleModel.find.mockReturnValue(chainedPopulate(modules));

      const result = await service.findAll();
      expect(result).toEqual(modules);
      expect(moduleModel.find).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // FIND ONE
  // ═══════════════════════════════════════════════════════════

  describe('findOne', () => {
    it('should return a module when found', async () => {
      moduleModel.findById.mockReturnValue(chainedFindPopulate(mockModule));

      const result = await service.findOne(mockModule._id);
      expect(result).toEqual(mockModule);
    });

    it('should throw NotFoundException when module not found', async () => {
      moduleModel.findById.mockReturnValue(chainedFindPopulate(null));

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════
  // FIND BY TEACHER
  // ═══════════════════════════════════════════════════════════

  describe('findByTeacher', () => {
    it('should return modules for a specific teacher', async () => {
      const modules = [mockModule];
      moduleModel.find.mockReturnValue(chainedPopulate(modules));

      const result = await service.findByTeacher('60d5ec49f1b2c72b9c8e4a1a');
      expect(result).toEqual(modules);
      expect(moduleModel.find).toHaveBeenCalledWith({
        teacherId: '60d5ec49f1b2c72b9c8e4a1a',
      });
    });
  });

  // ═══════════════════════════════════════════════════════════
  // UPDATE
  // ═══════════════════════════════════════════════════════════

  describe('update', () => {
    it('should update and return the module', async () => {
      const updated = { ...mockModule, name: 'React.js' };
      moduleModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updated),
      });

      const result = await service.update(mockModule._id, {
        name: 'React.js',
      });
      expect(result.name).toBe('React.js');
    });

    it('should throw NotFoundException when module to update not found', async () => {
      moduleModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.update('nonexistent-id', { name: 'React.js' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // REMOVE
  // ═══════════════════════════════════════════════════════════

  describe('remove', () => {
    it('should delete the module successfully', async () => {
      moduleModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockModule),
      });

      await expect(service.remove(mockModule._id)).resolves.toBeUndefined();
    });

    it('should throw NotFoundException when module to delete not found', async () => {
      moduleModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.remove('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
