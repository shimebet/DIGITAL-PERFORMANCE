
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PerformanceService } from './performance.service.js';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { ScopeService } from '../auth/services/scope.service.js';

import type {
  AuthenticatedUser,
  AuthenticatedUserRoleAssignment,
} from '../auth/interfaces/authenticated-user.interface.js';

describe('PerformanceService target branch scope security', () => {
  let service: PerformanceService;

  const prismaMock = {
    staffProfile: {
      findUnique: vi.fn(),
    },
    branch: {
      findMany: vi.fn(),
    },
  };

  const scopeMock = {
    isGlobal: vi.fn(),
    getRegionIds: vi.fn(),
    getDistrictIds: vi.fn(),
    getBranchIds: vi.fn(),
  };

  const branchAssignment: AuthenticatedUserRoleAssignment = {
    roleCode: 'BRANCH_MANAGER',
    scopeType: 'BRANCH',
    regionId: null,
    districtId: null,
    branchId: 'branch-a',
    permissions: ['performance.read'],
  };

  const staffAssignment: AuthenticatedUserRoleAssignment = {
    roleCode: 'DIGITAL_RESKILLED_STAFF',
    scopeType: 'STAFF',
    regionId: null,
    districtId: null,
    branchId: null,
    permissions: ['performance.read'],
  };

  const makeUser = (
    overrides: Partial<AuthenticatedUser> = {},
  ): AuthenticatedUser => ({
    id: 'user-1',
    username: 'test-user',
    firstName: 'Test',
    lastName: 'User',
    mustChangePassword: false,
    roles: ['BRANCH_MANAGER'],
    permissions: ['performance.read'],
    scopes: [
      {
        scopeType: 'BRANCH',
        regionId: null,
        districtId: null,
        branchId: 'branch-a',
      },
    ],
    roleAssignments: [{ ...branchAssignment }],
    ...overrides,
  });

  beforeEach(() => {
    vi.resetAllMocks();

    scopeMock.isGlobal.mockReturnValue(false);
    scopeMock.getRegionIds.mockReturnValue([]);
    scopeMock.getDistrictIds.mockReturnValue([]);
    scopeMock.getBranchIds.mockReturnValue(['branch-a']);

    prismaMock.branch.findMany.mockResolvedValue([
      { id: 'branch-a' },
    ]);

    service = new PerformanceService(
      prismaMock as unknown as PrismaService,
      scopeMock as unknown as ScopeService,
    );
  });

  // Invoke the private method through a narrowly typed
  // test-only interface, without changing production visibility.
  const getAccessibleBranches = (
    instance: PerformanceService,
    user: AuthenticatedUser,
  ): Promise<string[] | null> =>
    (
      instance as unknown as {
        getAccessibleTargetBranchIds(
          user: AuthenticatedUser,
        ): Promise<string[] | null>;
      }
    ).getAccessibleTargetBranchIds(user);

  it('does not look up a manager staff profile to widen branch access', async () => {
    const user = makeUser();

    const result = await getAccessibleBranches(service, user);

    expect(
      prismaMock.staffProfile.findUnique,
    ).not.toHaveBeenCalled();

    expect(result).toEqual(['branch-a']);

    expect(prismaMock.branch.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            {
              id: {
                in: ['branch-a'],
              },
            },
          ],
        },
      }),
    );
  });

  it('allows an active staff-only profile branch', async () => {
    const user = makeUser({
      roles: ['DIGITAL_RESKILLED_STAFF'],
      scopes: [
        {
          scopeType: 'STAFF',
          regionId: null,
          districtId: null,
          branchId: null,
        },
      ],
      roleAssignments: [{ ...staffAssignment }],
    });

    scopeMock.getBranchIds.mockReturnValue([]);

    prismaMock.staffProfile.findUnique.mockResolvedValue({
      branchId: 'staff-branch',
      status: 'ACTIVE',
    });

    prismaMock.branch.findMany.mockResolvedValue([
      { id: 'staff-branch' },
    ]);

    const result = await getAccessibleBranches(service, user);

    expect(
      prismaMock.staffProfile.findUnique,
    ).toHaveBeenCalled();

    expect(result).toEqual(['staff-branch']);
  });

  it('rejects an inactive staff-only profile branch', async () => {
    const user = makeUser({
      roles: ['DIGITAL_RESKILLED_STAFF'],
      scopes: [],
      roleAssignments: [{ ...staffAssignment }],
    });

    scopeMock.getBranchIds.mockReturnValue([]);

    prismaMock.staffProfile.findUnique.mockResolvedValue({
      branchId: 'staff-branch',
      status: 'INACTIVE',
    });

    const result = await getAccessibleBranches(service, user);

    expect(result).toEqual([]);

    expect(prismaMock.branch.findMany).not.toHaveBeenCalled();
  });

  it('does not use staff-profile fallback for mixed-role accounts', async () => {
    const user = makeUser({
      roles: ['BRANCH_MANAGER', 'DIGITAL_RESKILLED_STAFF'],
      roleAssignments: [
        { ...branchAssignment },
        { ...staffAssignment },
      ],
    });

    const result = await getAccessibleBranches(service, user);

    expect(
      prismaMock.staffProfile.findUnique,
    ).not.toHaveBeenCalled();

    expect(result).toEqual(['branch-a']);
  });

  it('returns no branches for a non-global account without organizational scope', async () => {
    const user = makeUser({
      scopes: [],
      roleAssignments: [],
    });

    scopeMock.getBranchIds.mockReturnValue([]);

    const result = await getAccessibleBranches(service, user);

    expect(result).toEqual([]);

    expect(prismaMock.branch.findMany).not.toHaveBeenCalled();
  });

  it('returns unrestricted scope only for a global user', async () => {
    const user = makeUser({
      roles: ['SUPER_ADMIN'],
      roleAssignments: [
        {
          roleCode: 'SUPER_ADMIN',
          scopeType: 'GLOBAL',
          regionId: null,
          districtId: null,
          branchId: null,
          permissions: [],
        },
      ],
    });

    scopeMock.isGlobal.mockReturnValue(true);

    const result = await getAccessibleBranches(service, user);

    expect(result).toBeNull();

    expect(
      prismaMock.staffProfile.findUnique,
    ).not.toHaveBeenCalled();

    expect(prismaMock.branch.findMany).not.toHaveBeenCalled();
  });
});
