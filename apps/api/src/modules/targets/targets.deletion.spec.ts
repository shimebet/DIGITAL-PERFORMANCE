
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { TargetsService } from './targets.service.js';

import type {
  PrismaService,
} from '../../database/prisma/prisma.service.js';

import type {
  ScopeService,
} from '../auth/services/scope.service.js';

import type {
  AuthenticatedUser,
  AuthenticatedUserRoleAssignment,
} from '../auth/interfaces/authenticated-user.interface.js';

// ============================================================================
// TEST HELPERS
// ============================================================================

function makeRole(
  roleCode: string,
  scopeType: AuthenticatedUserRoleAssignment['scopeType'],
  resourceId: string | null,
  permissions: string[] = ['target.delete'],
): AuthenticatedUserRoleAssignment {
  return {
    roleCode,
    scopeType,
    regionId: scopeType === 'REGION' ? resourceId : null,
    districtId: scopeType === 'DISTRICT' ? resourceId : null,
    branchId: scopeType === 'BRANCH' ? resourceId : null,
    permissions,
  };
}

function makeUser(
  roleAssignments: AuthenticatedUserRoleAssignment[],
): AuthenticatedUser {
  return {
    id: 'manager-1',
    username: 'manager',
    firstName: 'Test',
    lastName: 'Manager',
    mustChangePassword: false,
    roles: roleAssignments.map((role) => role.roleCode),
    permissions: roleAssignments.flatMap(
      (role) => role.permissions ?? [],
    ),
    scopes: roleAssignments.map((role) => ({
      scopeType: role.scopeType,
      regionId: role.regionId,
      districtId: role.districtId,
      branchId: role.branchId,
    })),
    roleAssignments,
  };
}

// ============================================================================
// TARGET ASSIGNMENT DELETION TESTS
// ============================================================================

describe('TargetsService assignment deletion security', () => {
  const assignment = {
    id: 'assignment-1',
    targetId: 'target-1',
    scopeType: 'DISTRICT' as const,
    regionId: 'region-a',
    districtId: 'district-a',
    branchId: null,
    userId: null,
    productId: null,
    targetValue: 100,
  };

const prismaMock = {
  targetAssignment: {
    findUnique: vi.fn(),
    count: vi.fn(),
    delete: vi.fn(),
  },
};

  const scopeMock = {};

  let service: TargetsService;

  beforeEach(() => {
    vi.resetAllMocks();
// By default, an assignment has no child allocations.
prismaMock.targetAssignment.count.mockResolvedValue(0);
    prismaMock.targetAssignment.findUnique.mockResolvedValue(
      assignment,
    );

    prismaMock.targetAssignment.delete.mockResolvedValue(
      assignment,
    );

    service = new TargetsService(
      prismaMock as unknown as PrismaService,
      scopeMock as ScopeService,
    );
  });

  // --------------------------------------------------------------------------
  // 1. AUTHORIZED REGIONAL MANAGER
  // --------------------------------------------------------------------------

  it('allows a regional manager to delete a district assignment in their region', async () => {
    const user = makeUser([
      makeRole(
        'REGIONAL_MANAGER',
        'REGION',
        'region-a',
      ),
    ]);

    await expect(
      service.removeAssignment(assignment.id, user),
    ).resolves.toEqual(assignment);

    expect(
      prismaMock.targetAssignment.delete,
    ).toHaveBeenCalledWith({
      where: {
        id: assignment.id,
      },
    });
  });

  // --------------------------------------------------------------------------
  // 2. MISSING DELETE PERMISSION
  // --------------------------------------------------------------------------

  it('rejects a manager without target.delete permission', async () => {
    const user = makeUser([
      makeRole(
        'REGIONAL_MANAGER',
        'REGION',
        'region-a',
        ['target.create'],
      ),
    ]);

    await expect(
      service.removeAssignment(assignment.id, user),
    ).rejects.toThrow(ForbiddenException);

    expect(
      prismaMock.targetAssignment.delete,
    ).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // 3. CROSS-REGION DELETION
  // --------------------------------------------------------------------------

  it('rejects deletion outside the regional manager scope', async () => {
    const user = makeUser([
      makeRole(
        'REGIONAL_MANAGER',
        'REGION',
        'region-b',
      ),
    ]);

    await expect(
      service.removeAssignment(assignment.id, user),
    ).rejects.toThrow(ForbiddenException);

    expect(
      prismaMock.targetAssignment.delete,
    ).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // 4. WRONG MANAGEMENT LEVEL
  // --------------------------------------------------------------------------

  it('rejects a district manager deleting a district assignment', async () => {
    const user = makeUser([
      makeRole(
        'DISTRICT_MANAGER',
        'DISTRICT',
        'district-a',
      ),
    ]);

    await expect(
      service.removeAssignment(assignment.id, user),
    ).rejects.toThrow(ForbiddenException);

    expect(
      prismaMock.targetAssignment.delete,
    ).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // 5. BRANCH MANAGER DELETES STAFF ASSIGNMENT
  // --------------------------------------------------------------------------

  it('allows a branch manager to delete a staff assignment in their branch', async () => {
    const staffAssignment = {
      ...assignment,
      scopeType: 'STAFF' as const,
      branchId: 'branch-a',
      userId: 'staff-1',
    };

    prismaMock.targetAssignment.findUnique.mockResolvedValue(
      staffAssignment,
    );

    prismaMock.targetAssignment.delete.mockResolvedValue(
      staffAssignment,
    );

    const user = makeUser([
      makeRole(
        'BRANCH_MANAGER',
        'BRANCH',
        'branch-a',
      ),
    ]);

    await expect(
      service.removeAssignment(staffAssignment.id, user),
    ).resolves.toEqual(staffAssignment);

    expect(
      prismaMock.targetAssignment.delete,
    ).toHaveBeenCalledOnce();
  });

  // --------------------------------------------------------------------------
  // 6. CROSS-BRANCH DELETION
  // --------------------------------------------------------------------------

  it('rejects a branch manager deleting staff assignment outside their branch', async () => {
    const staffAssignment = {
      ...assignment,
      scopeType: 'STAFF' as const,
      branchId: 'branch-b',
      userId: 'staff-2',
    };

    prismaMock.targetAssignment.findUnique.mockResolvedValue(
      staffAssignment,
    );

    const user = makeUser([
      makeRole(
        'BRANCH_MANAGER',
        'BRANCH',
        'branch-a',
      ),
    ]);

    await expect(
      service.removeAssignment(staffAssignment.id, user),
    ).rejects.toThrow(ForbiddenException);

    expect(
      prismaMock.targetAssignment.delete,
    ).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // 7. NONEXISTENT ASSIGNMENT
  // --------------------------------------------------------------------------

  it('returns NotFoundException for a nonexistent assignment', async () => {
    prismaMock.targetAssignment.findUnique.mockResolvedValue(
      null,
    );

    const user = makeUser([
      makeRole(
        'REGIONAL_MANAGER',
        'REGION',
        'region-a',
      ),
    ]);

    await expect(
      service.removeAssignment('missing-assignment', user),
    ).rejects.toThrow(NotFoundException);

    expect(
      prismaMock.targetAssignment.delete,
    ).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // 8. GLOBAL ADMINISTRATOR
  // --------------------------------------------------------------------------

  it('allows a globally authorized super administrator to delete an assignment', async () => {
    const user = makeUser([
      makeRole(
        'SUPER_ADMIN',
        'GLOBAL',
        null,
      ),
    ]);

    await expect(
      service.removeAssignment(assignment.id, user),
    ).resolves.toEqual(assignment);

    expect(
      prismaMock.targetAssignment.delete,
    ).toHaveBeenCalledOnce();
  });

  // --------------------------------------------------------------------------
  // 9. READ-ONLY ROLE
  // --------------------------------------------------------------------------

  it('rejects a read-only analyst deleting an assignment', async () => {
    const user = makeUser([
      makeRole(
        'REGIONAL_ANALYST',
        'REGION',
        'region-a',
        ['target.read'],
      ),
    ]);

    await expect(
      service.removeAssignment(assignment.id, user),
    ).rejects.toThrow(ForbiddenException);

    expect(
      prismaMock.targetAssignment.delete,
    ).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
// 10. PREVENT DELETION OF PARENT ASSIGNMENT
// --------------------------------------------------------------------------

it('rejects deletion when the assignment has child allocations', async () => {
  prismaMock.targetAssignment.count.mockResolvedValue(2);

  const user = makeUser([
    makeRole(
      'SUPER_ADMIN',
      'GLOBAL',
      null,
    ),
  ]);

  await expect(
    service.removeAssignment(assignment.id, user),
  ).rejects.toThrow(ConflictException);

  expect(
    prismaMock.targetAssignment.count,
  ).toHaveBeenCalledWith({
    where: {
      parentAssignmentId: assignment.id,
    },
  });

  expect(
    prismaMock.targetAssignment.delete,
  ).not.toHaveBeenCalled();
});

// --------------------------------------------------------------------------
// 11. AUTHORIZATION BEFORE CHILD COUNT
// --------------------------------------------------------------------------

it('does not check child allocations when deletion is unauthorized', async () => {
  const user = makeUser([
    makeRole(
      'REGIONAL_MANAGER',
      'REGION',
      'region-b',
    ),
  ]);

  await expect(
    service.removeAssignment(assignment.id, user),
  ).rejects.toThrow(ForbiddenException);

  expect(
    prismaMock.targetAssignment.count,
  ).not.toHaveBeenCalled();

  expect(
    prismaMock.targetAssignment.delete,
  ).not.toHaveBeenCalled();
});
});
