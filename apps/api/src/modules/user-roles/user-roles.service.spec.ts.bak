import { ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserRolesController } from './user-roles.controller.js';
import { UserRolesService } from './user-roles.service.js';

import type { AssignUserRoleDto } from './dto/assign-user-role.dto.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';

const globalAssignment = {
  roleCode: 'SUPER_ADMIN',
  scopeType: 'GLOBAL' as const,
  regionId: null,
  districtId: null,
  branchId: null,
};

const adminUser = {
  id: 'admin-1',
  username: 'admin',
  firstName: 'System',
  lastName: 'Administrator',
  roles: ['SUPER_ADMIN'],
  permissions: [],
  scopes: [{
    scopeType: 'GLOBAL',
    regionId: null,
    districtId: null,
    branchId: null,
  }],
  roleAssignments: [globalAssignment],
} as AuthenticatedUser;

const branchStaff = {
  id: 'staff-1',
  username: 'branch.staff',
  firstName: 'Branch',
  lastName: 'Staff',
  roles: ['DIGITAL_RESKILLED_STAFF'],
  permissions: [],
  scopes: [{
    scopeType: 'BRANCH',
    regionId: null,
    districtId: null,
    branchId: 'branch-1',
  }],
  roleAssignments: [{
    roleCode: 'DIGITAL_RESKILLED_STAFF',
    scopeType: 'BRANCH',
    regionId: null,
    districtId: null,
    branchId: 'branch-1',
  }],
} as AuthenticatedUser;

const regionalAdmin = {
  ...adminUser,
  id: 'regional-admin-1',
  scopes: [{
    scopeType: 'REGION',
    regionId: 'region-1',
    districtId: null,
    branchId: null,
  }],
  roleAssignments: [{
    roleCode: 'SUPER_ADMIN',
    scopeType: 'REGION',
    regionId: 'region-1',
    districtId: null,
    branchId: null,
  }],
} as AuthenticatedUser;

const splitScopeAdmin = {
  ...adminUser,
  id: 'split-scope-admin-1',
  roles: ['SYSTEM_ADMIN', 'READ_ONLY'],
  scopes: [
    { scopeType: 'REGION', regionId: 'region-1', districtId: null, branchId: null },
    { scopeType: 'GLOBAL', regionId: null, districtId: null, branchId: null },
  ],
  roleAssignments: [
    { roleCode: 'SYSTEM_ADMIN', scopeType: 'REGION', regionId: 'region-1', districtId: null, branchId: null },
    { roleCode: 'READ_ONLY', scopeType: 'GLOBAL', regionId: null, districtId: null, branchId: null },
  ],
} as AuthenticatedUser;

const dto = {
  userId: 'user-1',
  roleId: 'role-1',
  scopeType: 'GLOBAL',
} as AssignUserRoleDto;

const adminRequest = { user: adminUser };
const staffRequest = { user: branchStaff };
const regionalRequest = { user: regionalAdmin };
const splitScopeRequest = { user: splitScopeAdmin };

describe('UserRolesController', () => {
  let controller: UserRolesController;

  const serviceMock = {
    assign: vi.fn(),
    findByUser: vi.fn(),
    remove: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
    controller = new UserRolesController(
      serviceMock as unknown as UserRolesService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should assign a role to a user', async () => {
    const expected = { id: 'assignment-1', ...dto };
    serviceMock.assign.mockResolvedValue(expected);

    const result = await controller.assign(dto, adminRequest);

    expect(serviceMock.assign).toHaveBeenCalledWith(dto);
    expect(result).toEqual(expected);
  });

  it('should return roles assigned to a user', async () => {
    const assignments = [{ id: 'assignment-1', userId: 'user-1', roleId: 'role-1' }];
    serviceMock.findByUser.mockResolvedValue(assignments);

    const result = await controller.findByUser('user-1', adminRequest);

    expect(serviceMock.findByUser).toHaveBeenCalledWith('user-1');
    expect(result).toEqual(assignments);
  });

  it('should remove a role assignment', async () => {
    const expected = {
      success: true,
      message: 'Role assignment removed successfully',
    };
    serviceMock.remove.mockResolvedValue(expected);

    const result = await controller.remove('assignment-1', adminRequest);

    expect(serviceMock.remove).toHaveBeenCalledWith('assignment-1');
    expect(result).toEqual(expected);
  });

  it('should propagate assignment errors', async () => {
    serviceMock.assign.mockRejectedValue(new Error('Role assignment failed'));

    await expect(controller.assign(dto, adminRequest)).rejects.toThrow(
      'Role assignment failed',
    );
  });

  describe('Authorization', () => {
    it('should reject unauthorized role assignment', () => {
      expect(() => controller.assign(dto, staffRequest)).toThrow(ForbiddenException);
      expect(serviceMock.assign).not.toHaveBeenCalled();
    });

    it('should reject unauthorized role retrieval', () => {
      expect(() => controller.findByUser('user-1', staffRequest)).toThrow(ForbiddenException);
      expect(serviceMock.findByUser).not.toHaveBeenCalled();
    });

    it('should reject unauthorized role removal', () => {
      expect(() => controller.remove('assignment-1', staffRequest)).toThrow(ForbiddenException);
      expect(serviceMock.remove).not.toHaveBeenCalled();
    });

    it('should reject administrators without GLOBAL scope', () => {
      expect(() => controller.assign(dto, regionalRequest)).toThrow(ForbiddenException);
      expect(serviceMock.assign).not.toHaveBeenCalled();
    });

    it('should reject missing authenticated users', () => {
      expect(() => controller.assign(
        dto,
        {} as { user: AuthenticatedUser },
      )).toThrow(ForbiddenException);
      expect(serviceMock.assign).not.toHaveBeenCalled();
    });

    it('should reject unrelated administrator and GLOBAL assignments', () => {
      expect(() => controller.assign(dto, splitScopeRequest)).toThrow(ForbiddenException);
      expect(() => controller.findByUser('user-1', splitScopeRequest)).toThrow(ForbiddenException);
      expect(() => controller.remove('assignment-1', splitScopeRequest)).toThrow(ForbiddenException);
      expect(serviceMock.assign).not.toHaveBeenCalled();
      expect(serviceMock.findByUser).not.toHaveBeenCalled();
      expect(serviceMock.remove).not.toHaveBeenCalled();
    });

    it('should fail closed if linked role assignments are absent', () => {
      const legacyRequest = {
        user: {
          ...adminUser,
          roleAssignments: undefined,
        } as AuthenticatedUser,
      };
      expect(() => controller.assign(dto, legacyRequest)).toThrow(ForbiddenException);
      expect(serviceMock.assign).not.toHaveBeenCalled();
    });

    it('should allow SYSTEM_ADMIN with an explicit GLOBAL assignment', async () => {
      const systemAdminRequest = {
        user: {
          ...adminUser,
          roles: ['SYSTEM_ADMIN'],
          roleAssignments: [{ ...globalAssignment, roleCode: 'SYSTEM_ADMIN' }],
        } as AuthenticatedUser,
      };
      const expected = { id: 'assignment-2', ...dto };
      serviceMock.assign.mockResolvedValue(expected);

      await expect(controller.assign(dto, systemAdminRequest)).resolves.toEqual(expected);
      expect(serviceMock.assign).toHaveBeenCalledWith(dto);
    });
  });
});
