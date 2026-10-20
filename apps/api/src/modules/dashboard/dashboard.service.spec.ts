
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DashboardService } from './dashboard.service.js';

import { PrismaService } from '../../database/prisma/prisma.service.js';

import { PerformanceService } from '../performance/performance.service.js';

import { ScopeService } from '../auth/services/scope.service.js';

describe('DashboardService', () => {
  let service: DashboardService;

  const prismaMock = {
    district: {
      findFirst: vi.fn(),
    },
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

  it('restricts district dashboard data to the assigned branch', async () => {
    const query = {
      districtId: 'district-a',
    } as Parameters<DashboardService['overview']>[0];

    const user = {
      id: 'branch-manager-a',
      username: 'manager-a',
      firstName: 'Branch',
      lastName: 'Manager',
      mustChangePassword: false,
      roles: ['BRANCH_MANAGER'],
      permissions: ['dashboard.read'],
      scopes: [],
      roleAssignments: [],
    } as Parameters<DashboardService['overview']>[1];

    scopeServiceMock.isGlobal.mockReturnValue(false);
    scopeServiceMock.getBranchIds.mockReturnValue(['branch-a']);

    performanceServiceMock.summary.mockResolvedValue({});

    prismaMock.dailySubmission.groupBy.mockResolvedValue([]);
    prismaMock.followUp.groupBy.mockResolvedValue([]);
    prismaMock.followUp.count.mockResolvedValue(0);

    await service.overview(query, user);

    expect(scopeServiceMock.assertDistrictAccess).toHaveBeenCalledWith(
      user,
      'district-a',
    );

    expect(prismaMock.dailySubmission.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          branchId: 'branch-a',
          branch: {
            districtId: 'district-a',
          },
        }),
      }),
    );

    expect(prismaMock.followUp.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          branchId: 'branch-a',
          branch: {
            districtId: 'district-a',
          },
        }),
      }),
    );
  });

  it('restricts region dashboard data to the assigned branch', async () => {
    const query = {
      regionId: 'region-a',
    } as Parameters<DashboardService['overview']>[0];

    const user = {
      id: 'branch-manager-a',
      username: 'manager-a',
      firstName: 'Branch',
      lastName: 'Manager',
      mustChangePassword: false,
      roles: ['BRANCH_MANAGER'],
      permissions: ['dashboard.read'],
      scopes: [],
      roleAssignments: [],
    } as Parameters<DashboardService['overview']>[1];

    scopeServiceMock.isGlobal.mockReturnValue(false);
    scopeServiceMock.getRegionIds.mockReturnValue([]);
    scopeServiceMock.getDistrictIds.mockReturnValue([]);
    scopeServiceMock.getBranchIds.mockReturnValue(['branch-a']);

    performanceServiceMock.summary.mockResolvedValue({});

    prismaMock.dailySubmission.groupBy.mockResolvedValue([]);
    prismaMock.followUp.groupBy.mockResolvedValue([]);
    prismaMock.followUp.count.mockResolvedValue(0);

    await service.overview(query, user);

    expect(scopeServiceMock.assertRegionAccess).toHaveBeenCalledWith(
      user,
      'region-a',
    );

    expect(prismaMock.dailySubmission.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          branchId: 'branch-a',
          branch: {
            district: {
              regionId: 'region-a',
            },
          },
        }),
      }),
    );

    expect(prismaMock.followUp.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          branchId: 'branch-a',
          branch: {
            district: {
              regionId: 'region-a',
            },
          },
        }),
      }),
    );
  });

  it('allows a regional manager to view an authorized district', async () => {
    const query = {
      districtId: 'district-a',
    } as Parameters<DashboardService['overview']>[0];

    const user = {
      id: 'regional-manager-a',
      username: 'regional-manager-a',
      firstName: 'Regional',
      lastName: 'Manager',
      mustChangePassword: false,
      roles: ['REGIONAL_MANAGER'],
      permissions: ['dashboard.read'],
      scopes: [
        {
          scopeType: 'REGION',
          regionId: 'region-a',
          districtId: null,
          branchId: null,
        },
      ],
      roleAssignments: [],
    } as Parameters<DashboardService['overview']>[1];

    scopeServiceMock.isGlobal.mockReturnValue(false);
    scopeServiceMock.getRegionIds.mockReturnValue(['region-a']);
    scopeServiceMock.getDistrictIds.mockReturnValue([]);
    scopeServiceMock.getBranchIds.mockReturnValue([]);

    performanceServiceMock.summary.mockResolvedValue({});

    prismaMock.district.findFirst.mockResolvedValue({
      id: 'district-a',
    });

    prismaMock.dailySubmission.groupBy.mockResolvedValue([]);
    prismaMock.followUp.groupBy.mockResolvedValue([]);
    prismaMock.followUp.count.mockResolvedValue(0);

    await service.overview(query, user);

    // Verify that district access was authorized.
    expect(scopeServiceMock.assertDistrictAccess).toHaveBeenCalledWith(
      user,
      'district-a',
    );

    // Verify that the district belongs to an assigned region.
    expect(prismaMock.district.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'district-a',
        regionId: {
          in: ['region-a'],
        },
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    // Submission statistics must cover the authorized district.
    expect(prismaMock.dailySubmission.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          branch: {
            districtId: 'district-a',
          },
        }),
      }),
    );

    // Follow-up statistics must cover the authorized district.
    expect(prismaMock.followUp.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          branch: {
            districtId: 'district-a',
          },
        }),
      }),
    );

    const submissionWhere =
      prismaMock.dailySubmission.groupBy.mock.calls[0][0].where;

    const followUpWhere =
      prismaMock.followUp.groupBy.mock.calls[0][0].where;

    // A regional manager must not be restricted to an empty
    // list of directly assigned branches.
    expect(submissionWhere.branchId).toBeUndefined();
    expect(followUpWhere.branchId).toBeUndefined();
  });

  it('restricts a mixed-scope manager to an assigned branch outside their region', async () => {
    const query = {
      districtId: 'district-b',
    } as Parameters<DashboardService['overview']>[0];

    const user = {
      id: 'mixed-scope-manager',
      username: 'mixed-scope-manager',
      firstName: 'Mixed',
      lastName: 'Manager',
      mustChangePassword: false,
      roles: ['REGIONAL_MANAGER'],
      permissions: ['dashboard.read'],
      scopes: [
        {
          scopeType: 'REGION',
          regionId: 'region-a',
          districtId: null,
          branchId: null,
        },
        {
          scopeType: 'BRANCH',
          regionId: null,
          districtId: null,
          branchId: 'branch-b',
        },
      ],
      roleAssignments: [],
    } as Parameters<DashboardService['overview']>[1];

    scopeServiceMock.isGlobal.mockReturnValue(false);
    scopeServiceMock.getRegionIds.mockReturnValue(['region-a']);
    scopeServiceMock.getDistrictIds.mockReturnValue([]);
    scopeServiceMock.getBranchIds.mockReturnValue(['branch-b']);

    performanceServiceMock.summary.mockResolvedValue({});

    // district-b does not belong to the assigned region-a.
    prismaMock.district.findFirst.mockResolvedValue(null);

    prismaMock.dailySubmission.groupBy.mockResolvedValue([]);
    prismaMock.followUp.groupBy.mockResolvedValue([]);
    prismaMock.followUp.count.mockResolvedValue(0);

    await service.overview(query, user);

    // Access to district-b is assumed to be granted through branch-b.
    expect(scopeServiceMock.assertDistrictAccess).toHaveBeenCalledWith(
      user,
      'district-b',
    );

    // Verify that regional membership was checked.
    expect(prismaMock.district.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'district-b',
        regionId: {
          in: ['region-a'],
        },
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    // Submission statistics must be restricted to branch-b.
    expect(prismaMock.dailySubmission.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          branchId: 'branch-b',
          branch: {
            districtId: 'district-b',
          },
        }),
      }),
    );

    // Follow-up statistics must also be restricted to branch-b.
    expect(prismaMock.followUp.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          branchId: 'branch-b',
          branch: {
            districtId: 'district-b',
          },
        }),
      }),
    );

    const submissionWhere =
      prismaMock.dailySubmission.groupBy.mock.calls[0][0].where;

    const followUpWhere =
      prismaMock.followUp.groupBy.mock.calls[0][0].where;

    // Prevent district-wide aggregation outside the assigned region.
    expect(submissionWhere.branchId).toBe('branch-b');
    expect(followUpWhere.branchId).toBe('branch-b');
  });
});
