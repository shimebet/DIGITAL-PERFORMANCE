
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

import { PerformanceService } from './performance.service.js';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { ScopeService } from '../auth/services/scope.service.js';

import type {
  AuthenticatedUser,
  AuthenticatedUserRoleAssignment,
} from '../auth/interfaces/authenticated-user.interface.js';

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
    getRegionIds: vi.fn(),
    getDistrictIds: vi.fn(),
    getBranchIds: vi.fn(),
  };

  const staffAssignment: AuthenticatedUserRoleAssignment = {
    roleCode: 'DIGITAL_RESKILLED_STAFF',
    scopeType: 'STAFF',
    regionId: null,
    districtId: null,
    branchId: null,
    permissions: ['performance.read'],
  };

  const branchManagerAssignment: AuthenticatedUserRoleAssignment = {
    roleCode: 'BRANCH_MANAGER',
    scopeType: 'BRANCH',
    regionId: null,
    districtId: null,
    branchId: 'branch-1',
    permissions: ['performance.read'],
  };

  const makeUser = (
    overrides: Partial<AuthenticatedUser> = {},
  ): AuthenticatedUser => ({
    id: 'staff-1',
    username: 'test-user',
    firstName: 'Test',
    lastName: 'User',
    mustChangePassword: false,
    roles: ['DIGITAL_RESKILLED_STAFF'],
    permissions: ['performance.read'],
    scopes: [
      {
        scopeType: 'STAFF',
        regionId: null,
        districtId: null,
        branchId: null,
      },
    ],
    roleAssignments: [{ ...staffAssignment }],
    ...overrides,
  });

  const makeQuery = (
    overrides: Record<string, string> = {},
  ): Parameters<PerformanceService['productComparison']>[0] =>
    ({
      startDate: '2026-10-01',
      endDate: '2026-10-15',
      ...overrides,
    }) as Parameters<PerformanceService['productComparison']>[0];

  beforeEach(() => {
    vi.resetAllMocks();

    scopeServiceMock.isGlobal.mockReturnValue(false);
    scopeServiceMock.getRegionIds.mockReturnValue([]);
    scopeServiceMock.getDistrictIds.mockReturnValue([]);
    scopeServiceMock.getBranchIds.mockReturnValue([]);

    prismaMock.activityProduct.findMany.mockResolvedValue([]);

    service = new PerformanceService(
      prismaMock as unknown as PrismaService,
      scopeServiceMock as unknown as ScopeService,
    );
  });

  // ============================================================
  // ORIGINAL TESTS
  // ============================================================

  it('rejects digital staff selecting another employee', async () => {
    const user = makeUser();

    await expect(
      service.productComparison(
        makeQuery({ staffId: 'staff-2' }),
        user,
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(
      prismaMock.activityProduct.findMany,
    ).not.toHaveBeenCalled();
  });

  it('restricts digital staff to their own records when staffId is omitted', async () => {
    const user = makeUser();

    await service.productComparison(makeQuery(), user);

    expect(
      prismaMock.activityProduct.findMany,
    ).toHaveBeenCalledWith(
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
    const user = makeUser();

    prismaMock.staffProfile.findUnique.mockResolvedValue({
      branchId: 'branch-1',
    });

    await service.productComparison(
      makeQuery({ staffId: 'staff-1' }),
      user,
    );

    expect(
      scopeServiceMock.assertBranchAccess,
    ).toHaveBeenCalledWith(user, 'branch-1');

    expect(
      prismaMock.activityProduct.findMany,
    ).toHaveBeenCalledWith(
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
    const user = makeUser();

    await expect(
      service.productComparison(
        makeQuery({
          startDate: '2026-10-31',
          endDate: '2026-10-01',
        }),
        user,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(
      prismaMock.activityProduct.findMany,
    ).not.toHaveBeenCalled();
  });

  it('validates organizational access before processing a date range', async () => {
    const user = makeUser();

    await expect(
      service.productComparison(
        makeQuery({
          regionId: 'region-1',
          districtId: 'district-1',
          branchId: 'branch-1',
          startDate: '2026-10-31',
          endDate: '2026-10-01',
        }),
        user,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(
      scopeServiceMock.assertRegionAccess,
    ).toHaveBeenCalledWith(user, 'region-1');

    expect(
      scopeServiceMock.assertDistrictAccess,
    ).toHaveBeenCalledWith(user, 'district-1');

    expect(
      scopeServiceMock.assertBranchAccess,
    ).toHaveBeenCalledWith(user, 'branch-1');

    expect(
      prismaMock.activityProduct.findMany,
    ).not.toHaveBeenCalled();
  });

  it('stops processing when branch access is denied', async () => {
    const user = makeUser();

    const accessError = new Error('Branch access denied');

    scopeServiceMock.assertBranchAccess.mockRejectedValue(
      accessError,
    );

    await expect(
      service.productComparison(
        makeQuery({ branchId: 'branch-unauthorized' }),
        user,
      ),
    ).rejects.toThrow('Branch access denied');

    expect(
      prismaMock.activityProduct.findMany,
    ).not.toHaveBeenCalled();
  });

  // ============================================================
  // MANAGEMENT SCOPE REGRESSION TESTS
  // ============================================================

  it('does not grant a branch manager unconditional access to their own records', async () => {
    const user = makeUser({
      id: 'manager-1',
      roles: ['BRANCH_MANAGER'],
      scopes: [
        {
          scopeType: 'BRANCH',
          regionId: null,
          districtId: null,
          branchId: 'branch-1',
        },
      ],
      roleAssignments: [{ ...branchManagerAssignment }],
    });

    scopeServiceMock.getBranchIds.mockReturnValue(['branch-1']);

    await service.productComparison(makeQuery(), user);

    const where =
      prismaMock.activityProduct.findMany.mock.calls[0][0]
        .where.activity;

    expect(JSON.stringify(where)).toContain('branch-1');
    expect(JSON.stringify(where)).not.toContain(
      '"staffId":"manager-1"',
    );
  });

  it('does not grant a manager without organizational scope access to activity records', async () => {
    const user = makeUser({
      id: 'manager-1',
      roles: ['BRANCH_MANAGER'],
      scopes: [],
      roleAssignments: [],
    });

    await service.productComparison(makeQuery(), user);

    const where =
      prismaMock.activityProduct.findMany.mock.calls[0][0]
        .where.activity;

    expect(where).toEqual(
      expect.objectContaining({
        OR: [],
      }),
    );
  });

  it('does not use staff-only fallback for mixed-role accounts', async () => {
    const user = makeUser({
      id: 'mixed-user',
      roles: [
        'DIGITAL_RESKILLED_STAFF',
        'BRANCH_MANAGER',
      ],
      roleAssignments: [
        { ...staffAssignment },
        { ...branchManagerAssignment },
      ],
    });

    scopeServiceMock.getBranchIds.mockReturnValue(['branch-1']);

    await service.productComparison(makeQuery(), user);

    const where =
      prismaMock.activityProduct.findMany.mock.calls[0][0]
        .where.activity;

    expect(JSON.stringify(where)).toContain('branch-1');
    expect(JSON.stringify(where)).not.toContain(
      '"staffId":"mixed-user"',
    );
  });

  it('keeps staff-only activity access restricted to the authenticated user', async () => {
    const user = makeUser({
      id: 'staff-1',
    });

    await service.productComparison(makeQuery(), user);

    const where =
      prismaMock.activityProduct.findMany.mock.calls[0][0]
        .where.activity;

    expect(where).toEqual(
      expect.objectContaining({
        staffId: 'staff-1',
      }),
    );
  });
});
