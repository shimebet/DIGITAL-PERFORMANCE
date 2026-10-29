
import { describe, expect, it } from 'vitest';

import type {
  AuthenticatedUser,
  AuthenticatedUserRoleAssignment,
} from '../auth/interfaces/authenticated-user.interface.js';

import {
  assertTargetAssignmentPermission,
} from './target-assignment-authorization.js';

// ============================================================================
// TEST USER FACTORY
// ============================================================================

function makeUser(
  roleAssignments: AuthenticatedUserRoleAssignment[] = [],
): AuthenticatedUser {
  return {
    id: 'user-1',
    username: 'test',
    firstName: 'Test',
    lastName: 'User',
    mustChangePassword: false,

    roles: roleAssignments.map(
      (assignment) => assignment.roleCode,
    ),

    permissions: [],
    scopes: [],
    roleAssignments,
  };
}

// ============================================================================
// TEST ROLE ASSIGNMENT FACTORY
// ============================================================================

function makeRole(
  roleCode: string,
  scopeType: AuthenticatedUserRoleAssignment['scopeType'],
  resourceId: string | null,
  permissions: string[] = ['target.create'],
): AuthenticatedUserRoleAssignment {
  return {
    roleCode,
    scopeType,

    regionId:
      scopeType === 'REGION'
        ? resourceId
        : null,

    districtId:
      scopeType === 'DISTRICT'
        ? resourceId
        : null,

    branchId:
      scopeType === 'BRANCH'
        ? resourceId
        : null,

    permissions,
  };
}

// ============================================================================
// TEST ORGANIZATIONAL RESOURCE
// ============================================================================

const resource = {
  regionId: 'region-a',
  districtId: 'district-a',
  branchId: 'branch-a',
};

// ============================================================================
// TARGET ASSIGNMENT AUTHORIZATION TESTS
// ============================================================================

describe('Target assignment authorization', () => {
  // ==========================================================================
  // REGIONAL MANAGER - CREATE
  // ==========================================================================

  it('allows a regional manager to allocate to a district in their region', () => {
    const user = makeUser([
      makeRole(
        'REGIONAL_MANAGER',
        'REGION',
        'region-a',
      ),
    ]);

    expect(() =>
      assertTargetAssignmentPermission(
        user,
        'DISTRICT',
        resource,
      ),
    ).not.toThrow();
  });

  it('rejects a regional manager allocating outside their region', () => {
    const user = makeUser([
      makeRole(
        'REGIONAL_MANAGER',
        'REGION',
        'region-b',
      ),
    ]);

    expect(() =>
      assertTargetAssignmentPermission(
        user,
        'DISTRICT',
        resource,
      ),
    ).toThrow();
  });

  // ==========================================================================
  // DISTRICT MANAGER - CREATE
  // ==========================================================================

  it('allows a district manager to allocate to a branch in their district', () => {
    const user = makeUser([
      makeRole(
        'DISTRICT_MANAGER',
        'DISTRICT',
        'district-a',
      ),
    ]);

    expect(() =>
      assertTargetAssignmentPermission(
        user,
        'BRANCH',
        resource,
      ),
    ).not.toThrow();
  });

  it('rejects a district manager allocating outside their district', () => {
    const user = makeUser([
      makeRole(
        'DISTRICT_MANAGER',
        'DISTRICT',
        'district-b',
      ),
    ]);

    expect(() =>
      assertTargetAssignmentPermission(
        user,
        'BRANCH',
        resource,
      ),
    ).toThrow();
  });

  // ==========================================================================
  // BRANCH MANAGER - CREATE
  // ==========================================================================

  it('allows a branch manager to allocate to staff in their branch', () => {
    const user = makeUser([
      makeRole(
        'BRANCH_MANAGER',
        'BRANCH',
        'branch-a',
      ),
    ]);

    expect(() =>
      assertTargetAssignmentPermission(
        user,
        'STAFF',
        resource,
      ),
    ).not.toThrow();
  });

  it('rejects a branch manager allocating staff from another branch', () => {
    const user = makeUser([
      makeRole(
        'BRANCH_MANAGER',
        'BRANCH',
        'branch-b',
      ),
    ]);

    expect(() =>
      assertTargetAssignmentPermission(
        user,
        'STAFF',
        resource,
      ),
    ).toThrow();
  });

  // ==========================================================================
  // INVALID ROLE-LEVEL ASSIGNMENT
  // ==========================================================================

  it('rejects a district manager assigning district targets', () => {
    const user = makeUser([
      makeRole(
        'DISTRICT_MANAGER',
        'DISTRICT',
        'district-a',
      ),
    ]);

    expect(() =>
      assertTargetAssignmentPermission(
        user,
        'DISTRICT',
        resource,
      ),
    ).toThrow();
  });

  // ==========================================================================
  // READ-ONLY PERMISSION
  // ==========================================================================

  it('rejects users with read-only permission', () => {
    const user = makeUser([
      makeRole(
        'REGIONAL_ANALYST',
        'REGION',
        'region-a',
        ['target.read'],
      ),
    ]);

    expect(() =>
      assertTargetAssignmentPermission(
        user,
        'DISTRICT',
        resource,
      ),
    ).toThrow();
  });

  // ==========================================================================
  // MISSING ROLE ASSIGNMENTS
  // ==========================================================================

  it('rejects users without role assignments', () => {
    const user = makeUser();

    user.roleAssignments = undefined;

    expect(() =>
      assertTargetAssignmentPermission(
        user,
        'DISTRICT',
        resource,
      ),
    ).toThrow();
  });

  // ==========================================================================
  // ROLE AND SCOPE ISOLATION
  // ==========================================================================

  it('does not combine permission and scope from different assignments', () => {
    const user = makeUser([
      makeRole(
        'REGIONAL_MANAGER',
        'REGION',
        'region-a',
        ['target.read'],
      ),

      makeRole(
        'REGIONAL_MANAGER',
        'REGION',
        'region-b',
        ['target.create'],
      ),
    ]);

    expect(() =>
      assertTargetAssignmentPermission(
        user,
        'DISTRICT',
        resource,
      ),
    ).toThrow();
  });

  // ==========================================================================
  // SUPER ADMINISTRATOR
  // ==========================================================================

  it('allows a globally authorized super administrator', () => {
    const user = makeUser([
      makeRole(
        'SUPER_ADMIN',
        'GLOBAL',
        null,
      ),
    ]);

    expect(() =>
      assertTargetAssignmentPermission(
        user,
        'DISTRICT',
        resource,
      ),
    ).not.toThrow();
  });

  // ==========================================================================
  // REGIONAL MANAGER - DELETE
  // ==========================================================================

  it('allows an authorized regional manager to delete a district assignment', () => {
    const user = makeUser([
      makeRole(
        'REGIONAL_MANAGER',
        'REGION',
        'region-a',
        ['target.delete'],
      ),
    ]);

    expect(() =>
      assertTargetAssignmentPermission(
        user,
        'DISTRICT',
        resource,
        'target.delete',
      ),
    ).not.toThrow();
  });

  // ==========================================================================
  // DELETE PERMISSION ENFORCEMENT
  // ==========================================================================

  it('rejects deletion without target.delete permission', () => {
    const user = makeUser([
      makeRole(
        'REGIONAL_MANAGER',
        'REGION',
        'region-a',
        ['target.create'],
      ),
    ]);

    expect(() =>
      assertTargetAssignmentPermission(
        user,
        'DISTRICT',
        resource,
        'target.delete',
      ),
    ).toThrow();
  });

  // ==========================================================================
  // BRANCH MANAGER - DELETE OUTSIDE SCOPE
  // ==========================================================================

  it('rejects branch manager deletion outside their branch', () => {
    const user = makeUser([
      makeRole(
        'BRANCH_MANAGER',
        'BRANCH',
        'branch-b',
        ['target.delete'],
      ),
    ]);

    expect(() =>
      assertTargetAssignmentPermission(
        user,
        'STAFF',
        resource,
        'target.delete',
      ),
    ).toThrow();
  });
});
