
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

import type { CreateUserDto } from './dto/create-user.dto.js';
import type { UpdateUserDto } from './dto/update-user.dto.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';

const adminUser = {
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
} as AuthenticatedUser;

describe('UsersController', () => {
  let controller: UsersController;

  const serviceMock = {
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
      serviceMock as unknown as UsersService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create a user', async () => {
    const dto = {
      username: 'testuser',
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
    } as CreateUserDto;

    const expected = {
      id: 'user-1',
      username: 'testuser',
      mustChangePassword: false,
      firstName: 'Test',
      lastName: 'User',
    };

    serviceMock.create.mockResolvedValue(expected);

    const result = await controller.create(
      dto,
      adminUser,
    );

    expect(serviceMock.create).toHaveBeenCalledWith(
      dto,
    );

    expect(result).toEqual(expected);
  });

  it('should return all users', async () => {
    const users = [
      { id: 'user-1', username: 'user1' },
      { id: 'user-2', username: 'user2' },
    ];

    serviceMock.findAll.mockResolvedValue(users);

    const result = await controller.findAll(adminUser);

    expect(serviceMock.findAll).toHaveBeenCalledOnce();
    expect(result).toEqual(users);
  });

  it('should return a user by ID', async () => {
    const expected = {
      id: 'user-1',
      username: 'testuser',
    };

    serviceMock.findOne.mockResolvedValue(expected);

    const result = await controller.findOne(
      'user-1',
      adminUser,
    );

    expect(serviceMock.findOne).toHaveBeenCalledWith(
      'user-1',
    );

    expect(result).toEqual(expected);
  });

  it('should update a user', async () => {
    const dto = {
      firstName: 'Updated',
    } as UpdateUserDto;

    const expected = {
      id: 'user-1',
      firstName: 'Updated',
    };

    serviceMock.update.mockResolvedValue(expected);

    const result = await controller.update(
      'user-1',
      dto,
      adminUser,
    );

    expect(serviceMock.update).toHaveBeenCalledWith(
      'user-1',
      dto,
      'admin-user-1',
    );

    expect(result).toEqual(expected);
  });

  it('should prevent administrator self-deactivation', () => {
    const dto = {
      status: 'INACTIVE',
    } as UpdateUserDto;

    expect(() =>
      controller.update(
        adminUser.id,
        dto,
        adminUser,
      ),
    ).toThrow(ForbiddenException);

    expect(serviceMock.update).not.toHaveBeenCalled();
  });

  it('should prevent administrator self-locking', () => {
    const dto = {
      status: 'LOCKED',
    } as UpdateUserDto;

    expect(() =>
      controller.update(
        adminUser.id,
        dto,
        adminUser,
      ),
    ).toThrow(ForbiddenException);

    expect(serviceMock.update).not.toHaveBeenCalled();
  });

  it('should prevent administrator self-suspension', () => {
    const dto = {
      status: 'SUSPENDED',
    } as UpdateUserDto;

    expect(() =>
      controller.update(
        adminUser.id,
        dto,
        adminUser,
      ),
    ).toThrow(ForbiddenException);

    expect(serviceMock.update).not.toHaveBeenCalled();
  });

  it('should reset another user password', async () => {
    const dto = {
      temporaryPassword: 'TemporaryPassword123!',
    };

    const expected = {
      success: true,
      message: 'Password reset successfully',
    };

    serviceMock.resetPassword.mockResolvedValue(expected);

    const result = await controller.resetPassword(
      'user-1',
      dto,
      adminUser,
    );

    expect(
      serviceMock.resetPassword,
    ).toHaveBeenCalledWith(
      'user-1',
      dto.temporaryPassword,
      'admin-user-1',
    );

    expect(result).toEqual(expected);
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
      serviceMock.resetPassword,
    ).not.toHaveBeenCalled();
  });

  it('should soft-delete a user', async () => {
    const expected = {
      success: true,
      message: 'User deleted successfully',
    };

    serviceMock.softDelete.mockResolvedValue(expected);

    const result = await controller.remove(
      'user-1',
      adminUser,
    );

    expect(
      serviceMock.softDelete,
    ).toHaveBeenCalledWith(
      'user-1',
      'admin-user-1',
    );

    expect(result).toEqual(expected);
  });

  it('should propagate service errors', async () => {
    serviceMock.findOne.mockRejectedValue(
      new Error('User not found'),
    );

    await expect(
      controller.findOne(
        'missing-user',
        adminUser,
      ),
    ).rejects.toThrow('User not found');
  });
});
