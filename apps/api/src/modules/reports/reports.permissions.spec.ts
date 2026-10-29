
import { describe, expect, it } from 'vitest';
import {
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ReportsController } from './reports.controller.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';

import type {
  AuthenticatedUser,
  AuthenticatedUserRoleAssignment,
} from '../auth/interfaces/authenticated-user.interface.js';

describe('Reports export permissions', () => {
  const reflector = new Reflector();
  const guard = new PermissionsGuard(reflector);

  // ============================================================
  // TEST USER FACTORY
  //
  // Permissions must come from effective role assignments.
  // The aggregated user.permissions field is not sufficient
  // for authorization.
  // ============================================================

  const createAssignment = (
    permissions: string[],
    overrides: Partial<AuthenticatedUserRoleAssignment> = {},
  ): AuthenticatedUserRoleAssignment => ({
    roleCode: 'BRANCH_MANAGER',
    scopeType: 'BRANCH',
    regionId: null,
    districtId: null,
    branchId: 'branch-a',
    permissions,
    ...overrides,
  });

  const createUser = (
    permissions: string[],
    roleAssignments?: AuthenticatedUserRoleAssignment[],
  ): AuthenticatedUser => ({
    id: 'test-user',
    username: 'test-branch-manager',
    firstName: 'Test',
    lastName: 'Manager',
    mustChangePassword: false,

    roles: ['BRANCH_MANAGER'],

    // Retained for compatibility with the authenticated-user
    // interface. The guard must not trust this field alone.
    permissions,

    scopes: [
      {
        scopeType: 'BRANCH',
        regionId: null,
        districtId: null,
        branchId: 'branch-a',
      },
    ],

    roleAssignments:
      roleAssignments ?? [createAssignment(permissions)],
  });

  const createContext = (
    method: keyof ReportsController,
    permissions: string[],
    roleAssignments?: AuthenticatedUserRoleAssignment[],
  ): ExecutionContext => {
    const handler = ReportsController.prototype[method];

    const user = createUser(
      permissions,
      roleAssignments,
    );

    return {
      getHandler: () => handler,
      getClass: () => ReportsController,

      switchToHttp: () => ({
        getRequest: () => ({
          user,
        }),
      }),
    } as unknown as ExecutionContext;
  };

  // ============================================================
  // ORIGINAL PERMISSION TESTS
  // ============================================================

  it('denies CSV export without report.export permission', () => {
    const context = createContext(
      'exportCsv',
      ['report.read'],
    );

    expect(() => guard.canActivate(context)).toThrow(
      ForbiddenException,
    );
  });

  it('denies Excel export without report.export permission', () => {
    const context = createContext(
      'exportExcel',
      ['report.read'],
    );

    expect(() => guard.canActivate(context)).toThrow(
      ForbiddenException,
    );
  });

  it('allows CSV export with report.export permission', () => {
    const context = createContext(
      'exportCsv',
      ['report.export'],
    );

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows Excel export with report.export permission', () => {
    const context = createContext(
      'exportExcel',
      ['report.export'],
    );

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows report reading with report.read permission', () => {
    const context = createContext(
      'getPerformance',
      ['report.read'],
    );

    expect(guard.canActivate(context)).toBe(true);
  });

  it('denies report reading without report.read permission', () => {
    const context = createContext(
      'getPerformance',
      ['report.export'],
    );

    expect(() => guard.canActivate(context)).toThrow(
      ForbiddenException,
    );
  });

  // ============================================================
  // SECURITY REGRESSION TESTS
  // ============================================================

  it('rejects aggregate export permission without a matching role assignment', () => {
    const context = createContext(
      'exportCsv',
      ['report.export'],
      [
        createAssignment(['report.read']),
      ],
    );

    expect(() => guard.canActivate(context)).toThrow(
      ForbiddenException,
    );
  });

  it('rejects aggregate read permission without a matching role assignment', () => {
    const context = createContext(
      'getPerformance',
      ['report.read'],
      [
        createAssignment(['report.export']),
      ],
    );

    expect(() => guard.canActivate(context)).toThrow(
      ForbiddenException,
    );
  });

  it('rejects export when role assignments are empty', () => {
    const context = createContext(
      'exportCsv',
      ['report.export'],
      [],
    );

    expect(() => guard.canActivate(context)).toThrow(
      ForbiddenException,
    );
  });

  it('rejects export when the role assignment has no permissions', () => {
    const context = createContext(
      'exportCsv',
      ['report.export'],
      [
        createAssignment([]),
      ],
    );

    expect(() => guard.canActivate(context)).toThrow(
      ForbiddenException,
    );
  });

  it('rejects export when assignment permissions are undefined', () => {
    const context = createContext(
      'exportCsv',
      ['report.export'],
      [
        createAssignment([], {
          permissions: undefined,
        }),
      ],
    );

    expect(() => guard.canActivate(context)).toThrow(
      ForbiddenException,
    );
  });

  it('allows export when one of multiple assignments grants the permission', () => {
    const context = createContext(
      'exportCsv',
      ['report.export'],
      [
        createAssignment(
          ['report.read'],
          { branchId: 'branch-a' },
        ),
        createAssignment(
          ['report.export'],
          { branchId: 'branch-b' },
        ),
      ],
    );

    // PermissionsGuard checks whether a permission exists
    // in an assignment. It does not authorize access to a
    // particular branch or report dataset.
    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects export when no assignment grants the required permission', () => {
    const context = createContext(
      'exportCsv',
      ['report.export'],
      [
        createAssignment(
          ['report.read'],
          { branchId: 'branch-a' },
        ),
        createAssignment(
          ['report.read'],
          { branchId: 'branch-b' },
        ),
      ],
    );

    expect(() => guard.canActivate(context)).toThrow(
      ForbiddenException,
    );
  });

  it('allows a global SUPER_ADMIN assignment through the explicit bypass', () => {
    const context = createContext(
      'exportCsv',
      [],
      [
        createAssignment([], {
          roleCode: 'SUPER_ADMIN',
          scopeType: 'GLOBAL',
          regionId: null,
          districtId: null,
          branchId: null,
        }),
      ],
    );

    expect(guard.canActivate(context)).toBe(true);
  });

  it('does not allow SUPER_ADMIN bypass without GLOBAL scope', () => {
    const context = createContext(
      'exportCsv',
      [],
      [
        createAssignment([], {
          roleCode: 'SUPER_ADMIN',
          scopeType: 'BRANCH',
          branchId: 'branch-a',
        }),
      ],
    );

    expect(() => guard.canActivate(context)).toThrow(
      ForbiddenException,
    );
  });
});
