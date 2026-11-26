import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SparkService } from './spark.service.js';

describe('SparkService Logic Verification (TRD Section 5)', () => {
  let service: SparkService;
  let mockSparkModel: any;
  let mockUserModel: any;

  beforeEach(() => {
    mockSparkModel = {
      create: vi.fn().mockResolvedValue({}),
      find: vi.fn(),
    };
    mockUserModel = {
      findById: vi.fn(),
    };
    service = new SparkService(mockSparkModel, mockUserModel);
  });

  it('must return +0.25 Spark for PRESENT status', () => {
    const delta = service.getDelta('PRESENT');
    expect(delta).toBe(0.25);
  });

  it('must return -1.00 Spark for ABSENT status', () => {
    const delta = service.getDelta('ABSENT');
    expect(delta).toBe(-1.0);
  });

  it('must accurately compute balanceAfter for attendance progression', async () => {
    const dummyUser = {
      sparkBalance: 10.0,
      save: vi.fn().mockResolvedValue(true),
    };
    mockUserModel.findById.mockResolvedValue(dummyUser);

    const result = await service.applyAttendanceSpark(
      '64f1a2b3c4d5e6f7a8b9c0d1',
      'PRESENT',
      'Subject 1: Systems & Architecture',
    );

    expect(result.change).toBe(0.25);
    expect(result.balanceAfter).toBe(10.25);
    expect(dummyUser.sparkBalance).toBe(10.25);
  });

  it('must deduct 1.00 spark when ABSENT', async () => {
    const dummyUser = {
      sparkBalance: 10.25,
      save: vi.fn().mockResolvedValue(true),
    };
    mockUserModel.findById.mockResolvedValue(dummyUser);

    const result = await service.applyAttendanceSpark(
      '64f1a2b3c4d5e6f7a8b9c0d1',
      'ABSENT',
      'Subject 2: Creative & Engineering',
    );

    expect(result.change).toBe(-1.0);
    expect(result.balanceAfter).toBe(9.25);
    expect(dummyUser.sparkBalance).toBe(9.25);
  });
});
