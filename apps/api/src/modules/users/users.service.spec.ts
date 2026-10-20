
import {
  ForbiddenException,
  NotFoundException,
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

import type { CreateUserDto } from './dto/create-user.dto.js';
import type { UpdateUserDto } from './dto/update-user.dto.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';

const adminUser: AuthenticatedUser = {
  id: 'admin-user-1',
  username: 'admin',
  mustChangePassword: false,
  firstName: 'System',
  lastName: 'Administrator',
  roles: ['SUPER_ADMIN'],
  permissions: [],
  scopes: [
    {
      scopeType: 'GLOBAL',
      regionId: null,
      districtId: null,
      branchId: null,
    },
  ],
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

const branchStaff: AuthenticatedUser = {
  id: 'branch-staff-1',
  username: 'branch.staff',
  mustChangePassword: false,
  firstName: 'Branch',
  lastName: 'Staff',
  roles: ['DIGITAL_RESKILLED_STAFF'],
  permissions: [],
  scopes: [
    {
      scopeType: 'BRANCH',
      regionId: null,
      districtId: null,
      branchId: 'branch-1',
    },
  ],
};

describe('UsersController', () => {
  let controller: UsersController;

  const usersServiceMock = {
    create: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    resetPassword: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();

    controller = new UsersController(
      usersServiceMock as unknown as UsersService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create a user', async () => {
    const dto: CreateUserDto = {
      username: 'testuser',
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
    };

    const expected = {
      id: 'user-1',
      username: 'testuser',
    };

    usersServiceMock.create.mockResolvedValue(expected);

    const result = await controller.create(
      dto,
      adminUser,
    );

    expect(
      usersServiceMock.create,
    ).toHaveBeenCalledWith(dto);

    expect(result).toEqual(expected);
  });

  it('should return all users', async () => {
    const expected = [
      {
        id: 'user-1',
        username: 'testuser',
      },
      {
        id: 'user-2',
        username: 'anotheruser',
      },
    ];

    usersServiceMock.findAll.mockResolvedValue(expected);

    const result = await controller.findAll(adminUser);

    expect(
      usersServiceMock.findAll,
    ).toHaveBeenCalledOnce();

    expect(result).toEqual(expected);
  });

  it('should return a user by ID', async () => {
    const expected = {
      id: 'user-1',
      username: 'testuser',
    };

    usersServiceMock.findOne.mockResolvedValue(expected);

    const result = await controller.findOne(
      'user-1',
      adminUser,
    );

    expect(
      usersServiceMock.findOne,
    ).toHaveBeenCalledWith('user-1');

    expect(result).toEqual(expected);
  });

  it('should update a user with administrator attribution', async () => {
    const dto: UpdateUserDto = {
      firstName: 'Updated',
      lastName: 'User',
    };

    const expected = {
      id: 'user-1',
      firstName: 'Updated',
      lastName: 'User',
    };

    usersServiceMock.update.mockResolvedValue(expected);

    const result = await controller.update(
      'user-1',
      dto,
      adminUser,
    );

    expect(
      usersServiceMock.update,
    ).toHaveBeenCalledWith(
      'user-1',
      dto,
      'admin-user-1',
    );

    expect(result).toEqual(expected);
  });

  it('should soft-delete a user with administrator attribution', async () => {
    const expected = {
      success: true,
      message: 'User deleted successfully',
    };

    usersServiceMock.softDelete.mockResolvedValue(expected);

    const result = await controller.remove(
      'user-1',
      adminUser,
    );

    expect(
      usersServiceMock.softDelete,
    ).toHaveBeenCalledWith(
      'user-1',
      'admin-user-1',
    );

    expect(result).toEqual(expected);
  });

  it('should reset another user password', async () => {
    const dto = {
      temporaryPassword: 'TemporaryPassword123!',
    };

    const expected = {
      success: true,
    };

    usersServiceMock.resetPassword.mockResolvedValue(
      expected,
    );

    const result = await controller.resetPassword(
      'user-1',
      dto,
      adminUser,
    );

    expect(
      usersServiceMock.resetPassword,
    ).toHaveBeenCalledWith(
      'user-1',
      dto.temporaryPassword,
      adminUser.id,
    );

    expect(result).toEqual(expected);
  });

  it('should propagate service errors', async () => {
    usersServiceMock.findOne.mockRejectedValue(
      new NotFoundException('User not found'),
    );

    await expect(
      controller.findOne(
        'missing-user',
        adminUser,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  describe('Authorization', () => {
    it('should reject unauthorized user listing', () => {
      expect(() =>
        controller.findAll(branchStaff),
      ).toThrow(ForbiddenException);

      expect(
        usersServiceMock.findAll,
      ).not.toHaveBeenCalled();
    });

    it('should reject unauthorized user creation', () => {
      const dto: CreateUserDto = {
        username: 'newuser',
        password: 'TestPassword123!',
        firstName: 'New',
        lastName: 'User',
      };

      expect(() =>
        controller.create(dto, branchStaff),
      ).toThrow(ForbiddenException);

      expect(
        usersServiceMock.create,
      ).not.toHaveBeenCalled();
    });

    it('should reject unauthorized user deletion', () => {
      expect(() =>
        controller.remove(
          'user-1',
          branchStaff,
        ),
      ).toThrow(ForbiddenException);

      expect(
        usersServiceMock.softDelete,
      ).not.toHaveBeenCalled();
    });

    it('should prevent administrator self-deletion', () => {
      expect(() =>
        controller.remove(
          adminUser.id,
          adminUser,
        ),
      ).toThrow(ForbiddenException);

      expect(
        usersServiceMock.softDelete,
      ).not.toHaveBeenCalled();
    });

    it('should prevent administrator self-deactivation', () => {
      const dto: UpdateUserDto = {
        status: 'INACTIVE',
      };

      expect(() =>
        controller.update(
          adminUser.id,
          dto,
          adminUser,
        ),
      ).toThrow(ForbiddenException);

      expect(
        usersServiceMock.update,
      ).not.toHaveBeenCalled();
    });

    it('should prevent administrator self-password-reset', () => {
      const dto = {
        temporaryPassword: 'TemporaryPassword123!',
      };

      expect(() =>
        controller.resetPassword(
          adminUser.id,
          dto,
          adminUser,
        ),
      ).toThrow(ForbiddenException);

      expect(
        usersServiceMock.resetPassword,
      ).not.toHaveBeenCalled();
    });

    it('should reject branch staff password reset', () => {
      const dto = {
        temporaryPassword: 'TemporaryPassword123!',
      };

      expect(() =>
        controller.resetPassword(
          'user-1',
          dto,
          branchStaff,
        ),
      ).toThrow(ForbiddenException);

      expect(
        usersServiceMock.resetPassword,
      ).not.toHaveBeenCalled();
    });
  });
});
