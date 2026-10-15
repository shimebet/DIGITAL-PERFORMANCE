
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BadRequestException } from '@nestjs/common';

import { TargetsService } from './targets.service.js';

import { PrismaService } from '../../database/prisma/prisma.service.js';

import { ScopeService } from '../auth/services/scope.service.js';

describe('TargetsService', () => {
  let service: TargetsService;

  const prismaMock = {
    target: {
      create: vi.fn(),
    },
  };

  const scopeServiceMock = {};

  beforeEach(() => {
    vi.resetAllMocks();

    service = new TargetsService(
      prismaMock as unknown as PrismaService,
      scopeServiceMock as ScopeService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects a target when endDate is before startDate', async () => {
    const dto = {
      name: 'Monthly Activations',
      startDate: '2026-10-31',
      endDate: '2026-10-01',
    } as Parameters<TargetsService['create']>[0];

    const user = {
      id: 'user-1',
    } as Parameters<TargetsService['create']>[1];

    await expect(
      service.create(dto, user),
    ).rejects.toThrow(BadRequestException);

    expect(prismaMock.target.create).not.toHaveBeenCalled();
  });

  it('creates a target with normalized name and dates', async () => {
    const dto = {
      name: ' Monthly Activations ',
      description: ' Monthly branch target ',
      metricType: 'ACTIVATION',
      periodType: 'MONTHLY',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      defaultTargetValue: 100,
    } as Parameters<TargetsService['create']>[0];

    const user = {
      id: 'user-1',
    } as Parameters<TargetsService['create']>[1];

    const expected = {
      id: 'target-1',
      name: 'Monthly Activations',
    };

    prismaMock.target.create.mockResolvedValue(expected);

    const result = await service.create(dto, user);

    expect(prismaMock.target.create).toHaveBeenCalledWith({
      data: {
        name: 'Monthly Activations',
        description: 'Monthly branch target',
        metricType: dto.metricType,
        periodType: dto.periodType,
        startDate: new Date('2026-10-01'),
        endDate: new Date('2026-10-31'),
        defaultTargetValue: 100,
        createdByUserId: 'user-1',
      },
    });

    expect(result).toEqual(expected);
  });

  it('allows a target with the same start and end date', async () => {
    const dto = {
      name: ' Daily Activations ',
      startDate: '2026-10-13',
      endDate: '2026-10-13',
    } as Parameters<TargetsService['create']>[0];

    const user = {
      id: 'user-1',
    } as Parameters<TargetsService['create']>[1];

    prismaMock.target.create.mockResolvedValue({
      id: 'target-2',
    });

    await service.create(dto, user);

    expect(prismaMock.target.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Daily Activations',
        startDate: new Date('2026-10-13'),
        endDate: new Date('2026-10-13'),
        createdByUserId: 'user-1',
      }),
    });
  });
});
