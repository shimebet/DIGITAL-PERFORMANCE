import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';

import { PerformanceService } from './performance.service.js';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { ScopeService } from '../auth/services/scope.service.js';

describe('PerformanceService management security', () => {
  let service: PerformanceService;

  const prismaMock = {
    activity: {
      findMany: vi.fn(),
    },
    activityProduct: {
      findMany: vi.fn(),
    },
    staffProfile: {
      findUnique: vi.fn(),
    },
  };

  const scopeMock = {
    assertRegionAccess: vi.fn(),
    assertDistrictAccess: vi.fn(),
    assertBranchAccess: vi.fn(),
    isGlobal: vi.fn(),
    getRegionIds: vi.fn(),
    getDistrictIds: vi.fn(),
    getBranchIds: vi.fn(),
  };

  const manager = {
    id: 'manager-1',
    roles: ['BRANCH_MANAGER'],
  } as Parameters<PerformanceService['productComparison']>[1];

  beforeEach(() => {
    vi.resetAllMocks();

    scopeMock.isGlobal.mockReturnValue(false);
    scopeMock.getRegionIds.mockReturnValue([]);
    scopeMock.getDistrictIds.mockReturnValue([]);
    scopeMock.getBranchIds.mockReturnValue(['branch-1']);

    service = new PerformanceService(
      prismaMock as unknown as PrismaService,
      scopeMock as unknown as ScopeService,
    );
  });

  it('rejects an unauthorized branch', async () => {
    scopeMock.assertBranchAccess.mockRejectedValue(
      new ForbiddenException('Branch access denied'),
    );

    const query = {
      branchId: 'branch-2',
      startDate: '2026-10-01',
      endDate: '2026-10-15',
    } as Parameters<PerformanceService['productComparison']>[0];

    await expect(
      service.productComparison(query, manager),
    ).rejects.toThrow(ForbiddenException);

    expect(scopeMock.assertBranchAccess).toHaveBeenCalledWith(
      manager,
      'branch-2',
    );

    expect(prismaMock.activityProduct.findMany).not.toHaveBeenCalled();
  });

  it('rejects staff outside the manager authorized branch', async () => {
    prismaMock.staffProfile.findUnique.mockResolvedValue({
      branchId: 'branch-2',
    });

    scopeMock.assertBranchAccess.mockRejectedValue(
      new ForbiddenException('Branch access denied'),
    );

    const query = {
      staffId: 'staff-2',
      startDate: '2026-10-01',
      endDate: '2026-10-15',
    } as Parameters<PerformanceService['productComparison']>[0];

    await expect(
      service.productComparison(query, manager),
    ).rejects.toThrow(ForbiddenException);

    expect(prismaMock.staffProfile.findUnique).toHaveBeenCalledWith({
      where: {
        userId: 'staff-2',
      },
      select: {
        branchId: true,
      },
    });

    expect(scopeMock.assertBranchAccess).toHaveBeenCalledWith(
      manager,
      'branch-2',
    );

    expect(prismaMock.activityProduct.findMany).not.toHaveBeenCalled();
  });
  it('preserves district and region filters in performance summary', async () => {
  const query = {
    districtId: 'district-1',
    regionId: 'region-1',
    startDate: '2026-10-01',
    endDate: '2026-10-15',
  } as Parameters<PerformanceService['summary']>[0];

  prismaMock.activity.findMany.mockResolvedValue([]);

  try {
    await service.summary(query, manager);
  } catch {
    // The summary may need additional Prisma mocks after
    // findMany. We are inspecting the first query only.
  }

  expect(prismaMock.activity.findMany).toHaveBeenCalledTimes(1);

  const where = prismaMock.activity.findMany.mock.calls[0][0].where;

  // The district restriction must not be overwritten
  // when regionId is also supplied.
  expect(JSON.stringify(where)).toContain(
    '"districtId":"district-1"',
  );

  expect(JSON.stringify(where)).toContain(
    '"regionId":"region-1"',
  );

  // The authenticated user's branch authorization
  // must remain part of the query.
  expect(JSON.stringify(where)).toContain(
    '"branch-1"',
  );
});


it('preserves district and region filters in product comparison', async () => {
  const query = {
    districtId: 'district-1',
    regionId: 'region-1',
    startDate: '2026-10-01',
    endDate: '2026-10-15',
  } as Parameters<PerformanceService['productComparison']>[0];

  prismaMock.activityProduct.findMany.mockResolvedValue([]);

  await service.productComparison(query, manager);

  expect(prismaMock.activityProduct.findMany).toHaveBeenCalledTimes(1);

  const where =
    prismaMock.activityProduct.findMany.mock.calls[0][0].where.activity;

  expect(JSON.stringify(where)).toContain('"districtId":"district-1"');
  expect(JSON.stringify(where)).toContain('"regionId":"region-1"');
  expect(JSON.stringify(where)).toContain('"branch-1"');
});


it('preserves district and region filters in daily trend', async () => {
  const query = {
    districtId: 'district-1',
    regionId: 'region-1',
    startDate: '2026-10-01',
    endDate: '2026-10-15',
  } as Parameters<PerformanceService['dailyTrend']>[0];

  prismaMock.activity.findMany.mockResolvedValue([]);

  await service.dailyTrend(query, manager);

  expect(prismaMock.activity.findMany).toHaveBeenCalledTimes(1);

  const where = prismaMock.activity.findMany.mock.calls[0][0].where;

  expect(JSON.stringify(where)).toContain('"districtId":"district-1"');
  expect(JSON.stringify(where)).toContain('"regionId":"region-1"');
  expect(JSON.stringify(where)).toContain('"branch-1"');
});


});
