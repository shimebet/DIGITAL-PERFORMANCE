
import { describe, expect, it } from 'vitest';

import type {
  AuthenticatedUser,
} from '../../auth/interfaces/authenticated-user.interface.js';

import {
  canManageSubmission,
} from './submission-authorization.js';

const organization = {
  branchId: 'branch-a',
  districtId: 'district-a',
  regionId: 'region-a',
};

function makeUser(
  assignments: Array<
    Omit<
      NonNullable<AuthenticatedUser['roleAssignments']>[number],
      'regionId' | 'districtId' | 'branchId'
    > & {
      regionId?: string | null;
      districtId?: string | null;
      branchId?: string | null;
    }
  >,
): AuthenticatedUser {
  const roleAssignments = assignments.map((assignment) => ({
    ...assignment,
    regionId: assignment.regionId ?? null,
    districtId: assignment.districtId ?? null,
    branchId: assignment.branchId ?? null,
  }));

  return {
    id: 'manager-1',
    username: 'manager1',
    mustChangePassword: false,
    firstName: 'Test',
    lastName: 'Manager',
    roles: roleAssignments.map((item) => item.roleCode),
    permissions: [],
    scopes: roleAssignments.map(
      ({ scopeType, regionId, districtId, branchId }) => ({
        scopeType,
        regionId,
        districtId,
        branchId,
      }),
    ),
    roleAssignments,
  };
}

describe('canManageSubmission', () => {
  it('allows branch approval in the assigned branch', () => {
    const user = makeUser([{
      roleCode: 'BRANCH_MANAGER',
      scopeType: 'BRANCH',
      branchId: 'branch-a',
      permissions: ['submission.approve'],
    }]);

    expect(
      canManageSubmission(
        user,
        'submission.approve',
        organization,
      ),
    ).toBe(true);
  });

  it('denies branch approval in another branch', () => {
    const user = makeUser([{
      roleCode: 'BRANCH_MANAGER',
      scopeType: 'BRANCH',
      branchId: 'branch-b',
      permissions: ['submission.approve'],
    }]);

    expect(
      canManageSubmission(
        user,
        'submission.approve',
        organization,
      ),
    ).toBe(false);
  });

  it('allows district review within its district', () => {
    const user = makeUser([{
      roleCode: 'DISTRICT_MANAGER',
      scopeType: 'DISTRICT',
      districtId: 'district-a',
      permissions: ['submission.review'],
    }]);

    expect(
      canManageSubmission(
        user,
        'submission.review',
        organization,
      ),
    ).toBe(true);
  });

  it('allows district approval within its assigned district', () => {
    const user = makeUser([{
      roleCode: 'DISTRICT_MANAGER',
      scopeType: 'DISTRICT',
      districtId: 'district-a',
      permissions: ['submission.approve'],
    }]);

    expect(
      canManageSubmission(
        user,
        'submission.approve',
        organization,
      ),
    ).toBe(true);
  });

  it('denies district approval outside its assigned district', () => {
    const user = makeUser([{
      roleCode: 'DISTRICT_MANAGER',
      scopeType: 'DISTRICT',
      districtId: 'district-b',
      permissions: ['submission.approve'],
    }]);

    expect(
      canManageSubmission(
        user,
        'submission.approve',
        organization,
      ),
    ).toBe(false);
  });

  it('allows regional approval within its region', () => {
    const user = makeUser([{
      roleCode: 'REGIONAL_MANAGER',
      scopeType: 'REGION',
      regionId: 'region-a',
      permissions: ['submission.approve'],
    }]);

    expect(
      canManageSubmission(
        user,
        'submission.approve',
        organization,
      ),
    ).toBe(true);
  });

  it('denies regional approval outside its assigned region', () => {
    const user = makeUser([{
      roleCode: 'REGIONAL_MANAGER',
      scopeType: 'REGION',
      regionId: 'region-b',
      permissions: ['submission.approve'],
    }]);

    expect(
      canManageSubmission(
        user,
        'submission.approve',
        organization,
      ),
    ).toBe(false);
  });

  it('denies cross-role permission and scope mixing', () => {
    const user = makeUser([
      {
        roleCode: 'REGIONAL_ANALYST',
        scopeType: 'REGION',
        regionId: 'region-a',
        permissions: ['submission.read'],
      },
      {
        roleCode: 'BRANCH_MANAGER',
        scopeType: 'BRANCH',
        branchId: 'branch-b',
        permissions: ['submission.approve'],
      },
    ]);

    expect(
      canManageSubmission(
        user,
        'submission.approve',
        organization,
      ),
    ).toBe(false);
  });

  it('denies assignments without permission metadata', () => {
    const user = makeUser([{
      roleCode: 'BRANCH_MANAGER',
      scopeType: 'BRANCH',
      branchId: 'branch-a',
    }]);

    expect(
      canManageSubmission(
        user,
        'submission.approve',
        organization,
      ),
    ).toBe(false);
  });

  it('denies read-only assignments', () => {
    const user = makeUser([{
      roleCode: 'REGIONAL_ANALYST',
      scopeType: 'REGION',
      regionId: 'region-a',
      permissions: ['submission.read'],
    }]);

    expect(
      canManageSubmission(
        user,
        'submission.review',
        organization,
      ),
    ).toBe(false);
  });

  it('allows a global super administrator', () => {
    const user = makeUser([{
      roleCode: 'SUPER_ADMIN',
      scopeType: 'GLOBAL',
      permissions: [],
    }]);

    expect(
      canManageSubmission(
        user,
        'submission.approve',
        organization,
      ),
    ).toBe(true);
  });

  it('denies an ordinary global assignment', () => {
    const user = makeUser([{
      roleCode: 'BRANCH_MANAGER',
      scopeType: 'GLOBAL',
      permissions: ['submission.approve'],
    }]);

    expect(
      canManageSubmission(
        user,
        'submission.approve',
        organization,
      ),
    ).toBe(false);
  });
});
