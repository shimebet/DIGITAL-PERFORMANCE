
import { describe, expect, it } from 'vitest';

import type {
  AuthenticatedUser,
  AuthenticatedUserRoleAssignment,
} from '../interfaces/authenticated-user.interface.js';

import {
  hasScopedPermission,
  type OrganizationalResource,
} from './scoped-permission.js';

const resource: OrganizationalResource = {
  regionId: 'region-a',
  districtId: 'district-a',
  branchId: 'branch-a',
};

function makeAssignment(
  overrides: Partial<AuthenticatedUserRoleAssignment> = {},
): AuthenticatedUserRoleAssignment {
  return {
    roleCode: 'BRANCH_MANAGER',
    scopeType: 'BRANCH',
    regionId: null,
    districtId: null,
    branchId: 'branch-a',
    permissions: ['followup.read', 'followup.update'],
    ...overrides,
  };
}

function makeUser(
  roleAssignments?: AuthenticatedUserRoleAssignment[],
): AuthenticatedUser {
  return {
    id: 'user-1',
    username: 'test-user',
    firstName: 'Test',
    lastName: 'User',
    mustChangePassword: false,
    roles: [],
    permissions: [],
    scopes: [],
    roleAssignments,
  };
}

describe('Scoped follow-up permissions', () => {
  it('allows a manager with matching branch permission', () => {
    const user = makeUser([makeAssignment()]);

    expect(
      hasScopedPermission(user, 'followup.update', resource),
    ).toBe(true);
  });

  it('rejects a manager assigned to another branch', () => {
    const user = makeUser([
      makeAssignment({ branchId: 'branch-b' }),
    ]);

    expect(
      hasScopedPermission(user, 'followup.update', resource),
    ).toBe(false);
  });

  it('rejects a role without the requested permission', () => {
    const user = makeUser([
      makeAssignment({ permissions: ['followup.read'] }),
    ]);

    expect(
      hasScopedPermission(user, 'followup.update', resource),
    ).toBe(false);
  });

  it('does not combine permission and scope from different assignments', () => {
    const user = makeUser([
      makeAssignment({
        branchId: 'branch-a',
        permissions: ['followup.read'],
      }),
      makeAssignment({
        branchId: 'branch-b',
        permissions: ['followup.update'],
      }),
    ]);

    expect(
      hasScopedPermission(user, 'followup.update', resource),
    ).toBe(false);
  });

  it('allows a district assignment within its district', () => {
    const user = makeUser([
      makeAssignment({
        roleCode: 'DISTRICT_MANAGER',
        scopeType: 'DISTRICT',
        branchId: null,
        districtId: 'district-a',
      }),
    ]);

    expect(
      hasScopedPermission(user, 'followup.update', resource),
    ).toBe(true);
  });

  it('allows a regional assignment within its region', () => {
    const user = makeUser([
      makeAssignment({
        roleCode: 'REGIONAL_MANAGER',
        scopeType: 'REGION',
        branchId: null,
        regionId: 'region-a',
      }),
    ]);

    expect(
      hasScopedPermission(user, 'followup.read', resource),
    ).toBe(true);
  });

  it('rejects staff scope as organization-wide access', () => {
    const user = makeUser([
      makeAssignment({
        roleCode: 'DIGITAL_RESKILLED_STAFF',
        scopeType: 'STAFF',
      }),
    ]);

    expect(
      hasScopedPermission(user, 'followup.read', resource),
    ).toBe(false);
  });

  it('rejects missing role assignments', () => {
    const user = makeUser(undefined);

    expect(
      hasScopedPermission(user, 'followup.read', resource),
    ).toBe(false);
  });

  it('enforces an optional allowed-role restriction', () => {
    const user = makeUser([makeAssignment()]);

    expect(
      hasScopedPermission(
        user,
        'followup.update',
        resource,
        ['DISTRICT_MANAGER'],
      ),
    ).toBe(false);
  });
});
