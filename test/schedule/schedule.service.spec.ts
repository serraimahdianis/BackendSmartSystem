import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { ScheduleService } from '../../src/schedule/schedule.service';
import { Schedule } from '../../src/schedule/schemas/schedule.schema';

describe('ScheduleService', () => {
  let service: ScheduleService;
  let scheduleModel: Record<string, jest.Mock>;

  const mockSchedule = {
    _id: '60d5ec49f1b2c72b9c8e4a1c',
    teacherId: '60d5ec49f1b2c72b9c8e4a1a',
    moduleId: '60d5ec49f1b2c72b9c8e4a1b',
    type: 'td',
    year: 'L2',
    group: '2A',
    dayOfWeek: 'Sunday',
    startTime: '08:00',
    endTime: '09:30',
    room: 'Room A101',
  };

  // Helper for chained .find().populate().populate().exec()
  const chainedDoublePopulate = (result: any) => ({
    populate: jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(result),
      }),
    }),
  });

  // Helper for single populate chain (findByTeacher uses only moduleId populate)
  const chainedSinglePopulate = (result: any) => ({
    populate: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(result),
    }),
  });

  beforeEach(async () => {
    const saveMock = jest.fn().mockResolvedValue(mockSchedule);
    scheduleModel = {
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
    };

    const constructorFn = Object.assign(
      jest.fn().mockImplementation(() => ({ save: saveMock })),
      scheduleModel,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleService,
        { provide: getModelToken(Schedule.name), useValue: constructorFn },
      ],
    }).compile();

    service = module.get<ScheduleService>(ScheduleService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════
  // CREATE
  // ═══════════════════════════════════════════════════════════

  describe('create', () => {
    it('should create and return a new schedule', async () => {
      const dto = {
        teacherId: '60d5ec49f1b2c72b9c8e4a1a',
        moduleId: '60d5ec49f1b2c72b9c8e4a1b',
        type: 'td',
        year: 'L2',
        group: '2A',
        dayOfWeek: 'Sunday',
        startTime: '08:00',
        endTime: '09:30',
        room: 'Room A101',
      };

      const result = await service.create(dto);
      expect(result).toEqual(mockSchedule);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // FIND ALL — populates teacher + module
  // ═══════════════════════════════════════════════════════════

  describe('findAll', () => {
    it('should return all schedules with populated refs', async () => {
      const schedules = [mockSchedule];
      scheduleModel.find.mockReturnValue(chainedDoublePopulate(schedules));

      const result = await service.findAll();
      expect(result).toEqual(schedules);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // FIND ONE
  // ═══════════════════════════════════════════════════════════

  describe('findOne', () => {
    it('should return a schedule when found', async () => {
      scheduleModel.findById.mockReturnValue(
        chainedDoublePopulate(mockSchedule),
      );

      const result = await service.findOne(mockSchedule._id);
      expect(result).toEqual(mockSchedule);
    });

    it('should throw NotFoundException when schedule not found', async () => {
      scheduleModel.findById.mockReturnValue(chainedDoublePopulate(null));

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════
  // FIND BY TEACHER
  // ═══════════════════════════════════════════════════════════

  describe('findByTeacher', () => {
    it('should return schedules for a specific teacher', async () => {
      const schedules = [mockSchedule];
      scheduleModel.find.mockReturnValue(chainedSinglePopulate(schedules));

      const result = await service.findByTeacher('60d5ec49f1b2c72b9c8e4a1a');
      expect(result).toEqual(schedules);
      expect(scheduleModel.find).toHaveBeenCalledWith({
        teacherId: '60d5ec49f1b2c72b9c8e4a1a',
      });
    });
  });

  // ═══════════════════════════════════════════════════════════
  // UPDATE
  // ═══════════════════════════════════════════════════════════

  describe('update', () => {
    it('should update and return the schedule', async () => {
      const updated = { ...mockSchedule, room: 'Room B202' };
      scheduleModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updated),
      });

      const result = await service.update(mockSchedule._id, {
        room: 'Room B202',
      });
      expect(result.room).toBe('Room B202');
    });

    it('should throw NotFoundException when schedule to update not found', async () => {
      scheduleModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.update('nonexistent-id', { room: 'Room B202' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // REMOVE
  // ═══════════════════════════════════════════════════════════

  describe('remove', () => {
    it('should delete the schedule successfully', async () => {
      scheduleModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSchedule),
      });

      await expect(service.remove(mockSchedule._id)).resolves.toBeUndefined();
    });

    it('should throw NotFoundException when schedule to delete not found', async () => {
      scheduleModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.remove('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
