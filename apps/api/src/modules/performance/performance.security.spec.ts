import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';

import { PerformanceService } from './performance.service.js';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { ScopeService } from '../auth/services/scope.service.js';

describe('PerformanceService management security', () => {
  let service: PerformanceService;

  const prismaMock = {
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
});
