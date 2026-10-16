
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

import { PerformanceService } from './performance.service.js';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { ScopeService } from '../auth/services/scope.service.js';

describe('PerformanceService', () => {
  let service: PerformanceService;

const prismaMock = {
  activityProduct: {
    findMany: vi.fn(),
  },
  staffProfile: {
    findUnique: vi.fn(),
  },
};

const scopeServiceMock = {
  assertRegionAccess: vi.fn(),
  assertDistrictAccess: vi.fn(),
  assertBranchAccess: vi.fn(),
  isGlobal: vi.fn(),
};

  beforeEach(() => {
    vi.resetAllMocks();

    service = new PerformanceService(
      prismaMock as unknown as PrismaService,
      scopeServiceMock as unknown as ScopeService,
    );
  });

    it('rejects digital staff selecting another employee', async () => {
  const user = {
    id: 'staff-1',
    roles: ['DIGITAL_RESKILLED_STAFF'],
  } as Parameters<PerformanceService['productComparison']>[1];

  const query = {
    staffId: 'staff-2',
    startDate: '2026-10-01',
    endDate: '2026-10-15',
  } as Parameters<PerformanceService['productComparison']>[0];

  await expect(
    service.productComparison(query, user),
  ).rejects.toThrow(ForbiddenException);

  expect(prismaMock.activityProduct.findMany).not.toHaveBeenCalled();
});

it('restricts digital staff to their own records when staffId is omitted', async () => {
  const user = {
    id: 'staff-1',
    roles: ['DIGITAL_RESKILLED_STAFF'],
  } as Parameters<PerformanceService['productComparison']>[1];

  const query = {
    startDate: '2026-10-01',
    endDate: '2026-10-15',
  } as Parameters<PerformanceService['productComparison']>[0];

  prismaMock.activityProduct.findMany.mockResolvedValue([]);

  await service.productComparison(query, user);

  expect(prismaMock.activityProduct.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({
        activity: expect.objectContaining({
          staffId: 'staff-1',
        }),
      }),
    }),
  );
});

it('allows digital staff to select their own profile', async () => {
  const user = {
    id: 'staff-1',
    roles: ['DIGITAL_RESKILLED_STAFF'],
  } as Parameters<PerformanceService['productComparison']>[1];

  const query = {
    staffId: 'staff-1',
    startDate: '2026-10-01',
    endDate: '2026-10-15',
  } as Parameters<PerformanceService['productComparison']>[0];

  prismaMock.staffProfile.findUnique.mockResolvedValue({
    branchId: 'branch-1',
  });

  prismaMock.activityProduct.findMany.mockResolvedValue([]);

  await service.productComparison(query, user);

  expect(scopeServiceMock.assertBranchAccess).toHaveBeenCalledWith(
    user,
    'branch-1',
  );

  expect(prismaMock.activityProduct.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({
        activity: expect.objectContaining({
          staffId: 'staff-1',
        }),
      }),
    }),
  );
});

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects an invalid performance date range', async () => {
    const query = {
      startDate: '2026-10-31',
      endDate: '2026-10-01',
    } as Parameters<PerformanceService['productComparison']>[0];

    const user = {
      id: 'user-1',
    } as Parameters<PerformanceService['productComparison']>[1];

    await expect(
      service.productComparison(query, user),
    ).rejects.toThrow(BadRequestException);

    expect(prismaMock.activityProduct.findMany).not.toHaveBeenCalled();
  });

  it('validates organizational access before processing a date range', async () => {
    const query = {
      regionId: 'region-1',
      districtId: 'district-1',
      branchId: 'branch-1',
      startDate: '2026-10-31',
      endDate: '2026-10-01',
    } as Parameters<PerformanceService['productComparison']>[0];

    const user = {
      id: 'user-1',
    } as Parameters<PerformanceService['productComparison']>[1];

    await expect(
      service.productComparison(query, user),
    ).rejects.toThrow(BadRequestException);

    expect(scopeServiceMock.assertRegionAccess).toHaveBeenCalledWith(
      user,
      'region-1',
    );

    expect(scopeServiceMock.assertDistrictAccess).toHaveBeenCalledWith(
      user,
      'district-1',
    );

    expect(scopeServiceMock.assertBranchAccess).toHaveBeenCalledWith(
      user,
      'branch-1',
    );

    expect(prismaMock.activityProduct.findMany).not.toHaveBeenCalled();
  });

  it('stops processing when branch access is denied', async () => {
    const query = {
      branchId: 'branch-unauthorized',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
    } as Parameters<PerformanceService['productComparison']>[0];

    const user = {
      id: 'user-1',
    } as Parameters<PerformanceService['productComparison']>[1];

    const accessError = new Error('Branch access denied');

    scopeServiceMock.assertBranchAccess.mockRejectedValue(accessError);

    await expect(
      service.productComparison(query, user),
    ).rejects.toThrow('Branch access denied');

    expect(prismaMock.activityProduct.findMany).not.toHaveBeenCalled();
  });
});
