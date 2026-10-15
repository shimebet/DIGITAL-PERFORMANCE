
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DashboardService } from './dashboard.service.js';

import { PrismaService } from '../../database/prisma/prisma.service.js';

import { PerformanceService } from '../performance/performance.service.js';

import { ScopeService } from '../auth/services/scope.service.js';

describe('DashboardService', () => {
  let service: DashboardService;

  const prismaMock = {
    dailySubmission: {
      count: vi.fn(),
      groupBy: vi.fn(),
      aggregate: vi.fn(),
      findMany: vi.fn(),
    },
    followUp: {
      count: vi.fn(),
      groupBy: vi.fn(),
      aggregate: vi.fn(),
      findMany: vi.fn(),
    },
  };

  const performanceServiceMock = {
    summary: vi.fn(),
    branchRanking: vi.fn(),
  };

  const scopeServiceMock = {
    assertRegionAccess: vi.fn(),
    assertDistrictAccess: vi.fn(),
    assertBranchAccess: vi.fn(),
    isGlobal: vi.fn(),
    getRegionIds: vi.fn(),
    getDistrictIds: vi.fn(),
    getBranchIds: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();

    scopeServiceMock.isGlobal.mockReturnValue(true);
    scopeServiceMock.getRegionIds.mockReturnValue([]);
    scopeServiceMock.getDistrictIds.mockReturnValue([]);
    scopeServiceMock.getBranchIds.mockReturnValue([]);

    service = new DashboardService(
      prismaMock as unknown as PrismaService,
      performanceServiceMock as unknown as PerformanceService,
      scopeServiceMock as unknown as ScopeService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('stops overview processing if performance summary fails', async () => {
    const query =
      {} as Parameters<DashboardService['overview']>[0];

    const user = {
      id: 'user-1',
      roles: ['REGIONAL_MANAGER'],
    } as Parameters<DashboardService['overview']>[1];

    const error = new Error('Performance summary failed');

    performanceServiceMock.summary.mockRejectedValue(error);

    await expect(
      service.overview(query, user),
    ).rejects.toThrow('Performance summary failed');

    expect(performanceServiceMock.summary).toHaveBeenCalledWith(
      query,
      user,
    );

    expect(prismaMock.dailySubmission.count).not.toHaveBeenCalled();
    expect(prismaMock.followUp.count).not.toHaveBeenCalled();
  });

  it('rejects an unauthorized branch filter before reading submissions', async () => {
    const query = {
      branchId: 'unauthorized-branch',
    } as Parameters<DashboardService['overview']>[0];

    const user = {
      id: 'user-1',
      roles: ['REGIONAL_MANAGER'],
    } as Parameters<DashboardService['overview']>[1];

    performanceServiceMock.summary.mockResolvedValue({
      totalActivations: 100,
    });

    scopeServiceMock.assertBranchAccess.mockRejectedValue(
      new Error('Branch access denied'),
    );

    await expect(
      service.overview(query, user),
    ).rejects.toThrow('Branch access denied');

    expect(scopeServiceMock.assertBranchAccess).toHaveBeenCalledWith(
      user,
      'unauthorized-branch',
    );

    expect(prismaMock.dailySubmission.count).not.toHaveBeenCalled();
  });
});
