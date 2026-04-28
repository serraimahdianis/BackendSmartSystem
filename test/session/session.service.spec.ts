import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { SessionService } from '../../src/session/session.service';
import { Session } from '../../src/session/schemas/session.schema';

describe('SessionService', () => {
  let service: SessionService;
  let sessionModel: Record<string, jest.Mock>;

  const mockSession = {
    _id: '60d5ec49f1b2c72b9c8e4a1d',
    scheduleId: '60d5ec49f1b2c72b9c8e4a1c',
    teacherId: '60d5ec49f1b2c72b9c8e4a1a',
    moduleId: '60d5ec49f1b2c72b9c8e4a1b',
    date: new Date('2026-04-28'),
    startTime: '08:00',
    endTime: '09:30',
    type: 'td',
    group: '2A',
    status: 'planned',
    isReplacement: false,
    reasonForReplacement: '',
  };

  // Helper for triple populate chain: .populate().populate().populate().exec()
  const chainedTriplePopulate = (result: any) => ({
    populate: jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(result),
        }),
      }),
    }),
  });

  // Helper for single populate chain
  const chainedSinglePopulate = (result: any) => ({
    populate: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(result),
    }),
  });

  // Helper for double populate chain (findByDate)
  const chainedDoublePopulate = (result: any) => ({
    populate: jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(result),
      }),
    }),
  });

  beforeEach(async () => {
    const saveMock = jest.fn().mockResolvedValue(mockSession);
    sessionModel = {
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
    };

    const constructorFn = Object.assign(
      jest.fn().mockImplementation(() => ({ save: saveMock })),
      sessionModel,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: getModelToken(Session.name), useValue: constructorFn },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════
  // CREATE
  // ═══════════════════════════════════════════════════════════

  describe('create', () => {
    it('should create and return a new session', async () => {
      const dto = {
        scheduleId: '60d5ec49f1b2c72b9c8e4a1c',
        teacherId: '60d5ec49f1b2c72b9c8e4a1a',
        moduleId: '60d5ec49f1b2c72b9c8e4a1b',
        date: '2026-04-28',
        startTime: '08:00',
        endTime: '09:30',
        type: 'td',
        group: '2A',
        status: 'planned',
        isReplacement: false,
      };

      const result = await service.create(dto);
      expect(result).toEqual(mockSession);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // FIND ALL — triple populate
  // ═══════════════════════════════════════════════════════════

  describe('findAll', () => {
    it('should return all sessions with populated refs', async () => {
      const sessions = [mockSession];
      sessionModel.find.mockReturnValue(chainedTriplePopulate(sessions));

      const result = await service.findAll();
      expect(result).toEqual(sessions);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // FIND ONE
  // ═══════════════════════════════════════════════════════════

  describe('findOne', () => {
    it('should return a session when found', async () => {
      sessionModel.findById.mockReturnValue(chainedTriplePopulate(mockSession));

      const result = await service.findOne(mockSession._id);
      expect(result).toEqual(mockSession);
    });

    it('should throw NotFoundException when session not found', async () => {
      sessionModel.findById.mockReturnValue(chainedTriplePopulate(null));

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════
  // FIND BY TEACHER
  // ═══════════════════════════════════════════════════════════

  describe('findByTeacher', () => {
    it('should return sessions for a specific teacher', async () => {
      const sessions = [mockSession];
      sessionModel.find.mockReturnValue(chainedSinglePopulate(sessions));

      const result = await service.findByTeacher('60d5ec49f1b2c72b9c8e4a1a');
      expect(result).toEqual(sessions);
      expect(sessionModel.find).toHaveBeenCalledWith({
        teacherId: '60d5ec49f1b2c72b9c8e4a1a',
      });
    });
  });

  // ═══════════════════════════════════════════════════════════
  // FIND BY DATE — date range query
  // ═══════════════════════════════════════════════════════════

  describe('findByDate', () => {
    it('should return sessions for a specific date', async () => {
      const sessions = [mockSession];
      sessionModel.find.mockReturnValue(chainedDoublePopulate(sessions));

      const result = await service.findByDate('2026-04-28');
      expect(result).toEqual(sessions);
      // Verify the date range filter was applied
      expect(sessionModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          date: expect.objectContaining({
            $gte: expect.any(Date) as Date,
            $lte: expect.any(Date) as Date,
          }) as Record<string, Date>,
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════
  // UPDATE STATUS — planned → active → closed
  // ═══════════════════════════════════════════════════════════

  describe('updateStatus', () => {
    it('should update session status and return updated session', async () => {
      const updated = { ...mockSession, status: 'active' };
      sessionModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updated),
      });

      const result = await service.updateStatus(mockSession._id, 'active');
      expect(result.status).toBe('active');
      expect(sessionModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockSession._id,
        { status: 'active' },
        { new: true },
      );
    });

    it('should throw NotFoundException when session not found for status update', async () => {
      sessionModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.updateStatus('nonexistent-id', 'active'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // UPDATE
  // ═══════════════════════════════════════════════════════════

  describe('update', () => {
    it('should update and return the session', async () => {
      const updated = { ...mockSession, group: '3B' };
      sessionModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updated),
      });

      const result = await service.update(mockSession._id, { group: '3B' });
      expect(result.group).toBe('3B');
    });

    it('should throw NotFoundException when session to update not found', async () => {
      sessionModel.findByIdAndUpdate.mockReturnValue({
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
    it('should delete the session successfully', async () => {
      sessionModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSession),
      });

      await expect(service.remove(mockSession._id)).resolves.toBeUndefined();
    });

    it('should throw NotFoundException when session to delete not found', async () => {
      sessionModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.remove('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
