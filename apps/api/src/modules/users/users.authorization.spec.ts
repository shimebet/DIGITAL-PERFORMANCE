
import {
  ForbiddenException,
} from '@nestjs/common';

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

import type {
  AuthenticatedUser,
} from '../auth/interfaces/authenticated-user.interface.js';

describe('UsersController - Role Scope Authorization', () => {
  let controller: UsersController;

  const serviceMock = {
    create: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    resetPassword: vi.fn(),
  };

  const baseUser: AuthenticatedUser = {
    id: 'user-1',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    roles: [],
    permissions: [],
    scopes: [],
    roleAssignments: [],
  };

  beforeEach(() => {
    vi.resetAllMocks();

    controller = new UsersController(
      serviceMock as unknown as UsersService,
    );
  });

  it('allows a global SUPER_ADMIN', () => {
    const user: AuthenticatedUser = {
      ...baseUser,
      roles: ['SUPER_ADMIN'],
      roleAssignments: [
        {
          roleCode: 'SUPER_ADMIN',
          scopeType: 'GLOBAL',
          regionId: null,
          districtId: null,
          branchId: null,
        },
      ],
    };

    controller.findAll(user);

    expect(
      serviceMock.findAll,
    ).toHaveBeenCalledOnce();
  });

  it('allows a global SYSTEM_ADMIN', () => {
    const user: AuthenticatedUser = {
      ...baseUser,
      roles: ['SYSTEM_ADMIN'],
      roleAssignments: [
        {
          roleCode: 'SYSTEM_ADMIN',
          scopeType: 'GLOBAL',
          regionId: null,
          districtId: null,
          branchId: null,
        },
      ],
    };

    controller.findAll(user);

    expect(
      serviceMock.findAll,
    ).toHaveBeenCalledOnce();
  });

  it('rejects a branch-scoped administrator with an unrelated global role', () => {
    const user: AuthenticatedUser = {
      ...baseUser,
      roles: ['SYSTEM_ADMIN', 'READ_ONLY'],
      scopes: [
        {
          scopeType: 'BRANCH',
          regionId: null,
          districtId: null,
          branchId: 'branch-1',
        },
        {
          scopeType: 'GLOBAL',
          regionId: null,
          districtId: null,
          branchId: null,
        },
      ],
      roleAssignments: [
        {
          roleCode: 'SYSTEM_ADMIN',
          scopeType: 'BRANCH',
          regionId: null,
          districtId: null,
          branchId: 'branch-1',
        },
        {
          roleCode: 'READ_ONLY',
          scopeType: 'GLOBAL',
          regionId: null,
          districtId: null,
          branchId: null,
        },
      ],
    };

    expect(() =>
      controller.findAll(user),
    ).toThrow(ForbiddenException);

    expect(
      serviceMock.findAll,
    ).not.toHaveBeenCalled();
  });

  it('rejects a branch-scoped SUPER_ADMIN', () => {
    const user: AuthenticatedUser = {
      ...baseUser,
      roles: ['SUPER_ADMIN'],
      roleAssignments: [
        {
          roleCode: 'SUPER_ADMIN',
          scopeType: 'BRANCH',
          regionId: null,
          districtId: null,
          branchId: 'branch-1',
        },
      ],
    };

    expect(() =>
      controller.findAll(user),
    ).toThrow(ForbiddenException);
  });

  it('rejects a global READ_ONLY role', () => {
    const user: AuthenticatedUser = {
      ...baseUser,
      roles: ['READ_ONLY'],
      roleAssignments: [
        {
          roleCode: 'READ_ONLY',
          scopeType: 'GLOBAL',
          regionId: null,
          districtId: null,
          branchId: null,
        },
      ],
    };

    expect(() =>
      controller.findAll(user),
    ).toThrow(ForbiddenException);
  });

  it('rejects missing role assignments', () => {
    const user: AuthenticatedUser = {
      ...baseUser,
      roles: ['SUPER_ADMIN'],
      scopes: [
        {
          scopeType: 'GLOBAL',
          regionId: null,
          districtId: null,
          branchId: null,
        },
      ],
      roleAssignments: undefined,
    };

    expect(() =>
      controller.findAll(user),
    ).toThrow(ForbiddenException);
  });
});
