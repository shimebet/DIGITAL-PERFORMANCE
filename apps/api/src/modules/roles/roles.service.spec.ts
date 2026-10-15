
import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  RolesService,
} from './roles.service.js';

import {
  PrismaService,
} from '../../database/prisma/prisma.service.js';

import type {
  CreateRoleDto,
} from './dto/create-role.dto.js';

import type {
  UpdateRoleDto,
} from './dto/update-role.dto.js';

describe('RolesService', () => {
  let service: RolesService;

  const prismaMock = {
    role: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.resetAllMocks();

    service = new RolesService(
      prismaMock as unknown as PrismaService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =========================================================
  // CREATE ROLE
  // =========================================================

  it('should create a role with normalized code and name', async () => {
    const dto = {
      code: ' test_role ',
      name: ' Test Role ',
      description: ' Test description ',
    } as CreateRoleDto;

    const expected = {
      id: 'role-1',
      code: 'TEST_ROLE',
      name: 'Test Role',
      description: 'Test description',
      isSystemRole: false,
    };

    prismaMock.role.findUnique.mockResolvedValue(null);
    prismaMock.role.create.mockResolvedValue(expected);

    const result = await service.create(dto);

    expect(
      prismaMock.role.findUnique,
    ).toHaveBeenCalledWith({
      where: {
        code: 'TEST_ROLE',
      },
    });

    expect(
      prismaMock.role.create,
    ).toHaveBeenCalledWith({
      data: {
        code: 'TEST_ROLE',
        name: 'Test Role',
        description: 'Test description',
        isSystemRole: false,
      },
    });

    expect(result).toEqual(expected);
  });

  it('should preserve isSystemRole when explicitly provided', async () => {
    const dto = {
      code: 'SYSTEM_TEST',
      name: 'System Test',
      isSystemRole: true,
    } as CreateRoleDto;

    prismaMock.role.findUnique.mockResolvedValue(null);
    prismaMock.role.create.mockResolvedValue({
      id: 'role-1',
      code: 'SYSTEM_TEST',
      name: 'System Test',
      isSystemRole: true,
    });

    await service.create(dto);

    expect(
      prismaMock.role.create,
    ).toHaveBeenCalledWith({
      data: expect.objectContaining({
        isSystemRole: true,
      }),
    });
  });

  it('should reject duplicate role codes', async () => {
    const dto = {
      code: ' admin ',
      name: 'Administrator',
    } as CreateRoleDto;

    prismaMock.role.findUnique.mockResolvedValue({
      id: 'existing-role',
      code: 'ADMIN',
    });

    await expect(
      service.create(dto),
    ).rejects.toThrow(ConflictException);

    expect(
      prismaMock.role.findUnique,
    ).toHaveBeenCalledWith({
      where: {
        code: 'ADMIN',
      },
    });

    expect(
      prismaMock.role.create,
    ).not.toHaveBeenCalled();
  });

  // =========================================================
  // FIND ALL ROLES
  // =========================================================

  it('should return roles sorted by name', async () => {
    const roles = [
      {
        id: 'role-1',
        name: 'Administrator',
      },
      {
        id: 'role-2',
        name: 'Manager',
      },
    ];

    prismaMock.role.findMany.mockResolvedValue(roles);

    const result = await service.findAll();

    expect(
      prismaMock.role.findMany,
    ).toHaveBeenCalledWith({
      include: {
        _count: {
          select: {
            userRoles: true,
            rolePermissions: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    expect(result).toEqual(roles);
  });

  // =========================================================
  // FIND ONE ROLE
  // =========================================================

  it('should return a role with permissions and users', async () => {
    const role = {
      id: 'role-1',
      code: 'ADMIN',
      name: 'Administrator',
      isSystemRole: true,
      rolePermissions: [],
      userRoles: [],
    };

    prismaMock.role.findUnique.mockResolvedValue(role);

    const result = await service.findOne('role-1');

    expect(
      prismaMock.role.findUnique,
    ).toHaveBeenCalledWith({
      where: {
        id: 'role-1',
      },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        userRoles: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    expect(result).toEqual(role);
  });

  it('should throw NotFoundException when role does not exist', async () => {
    prismaMock.role.findUnique.mockResolvedValue(null);

    await expect(
      service.findOne('missing-role'),
    ).rejects.toThrow(NotFoundException);
  });

  // =========================================================
  // UPDATE ROLE
  // =========================================================

  it('should update an existing role and trim text fields', async () => {
    const dto = {
      name: ' Updated Manager ',
      description: ' Updated description ',
    } as UpdateRoleDto;

    prismaMock.role.findUnique.mockResolvedValue({
      id: 'role-1',
      isSystemRole: false,
    });

    const expected = {
      id: 'role-1',
      name: 'Updated Manager',
      description: 'Updated description',
    };

    prismaMock.role.update.mockResolvedValue(expected);

    const result = await service.update('role-1', dto);

    expect(
      prismaMock.role.update,
    ).toHaveBeenCalledWith({
      where: {
        id: 'role-1',
      },
      data: {
        name: 'Updated Manager',
        description: 'Updated description',
        status: undefined,
      },
    });

    expect(result).toEqual(expected);
  });

  it('should prevent archiving system roles', async () => {
    const dto = {
      status: 'ARCHIVED',
    } as UpdateRoleDto;

    prismaMock.role.findUnique.mockResolvedValue({
      id: 'system-role',
      isSystemRole: true,
    });

    await expect(
      service.update('system-role', dto),
    ).rejects.toThrow(ConflictException);

    expect(
      prismaMock.role.update,
    ).not.toHaveBeenCalled();
  });

  it('should allow archiving a non-system role', async () => {
    const dto = {
      status: 'ARCHIVED',
    } as UpdateRoleDto;

    prismaMock.role.findUnique.mockResolvedValue({
      id: 'custom-role',
      isSystemRole: false,
    });

    prismaMock.role.update.mockResolvedValue({
      id: 'custom-role',
      status: 'ARCHIVED',
    });

    const result = await service.update(
      'custom-role',
      dto,
    );

    expect(
      prismaMock.role.update,
    ).toHaveBeenCalledWith({
      where: {
        id: 'custom-role',
      },
      data: {
        name: undefined,
        description: undefined,
        status: 'ARCHIVED',
      },
    });

    expect(result.status).toBe('ARCHIVED');
  });

  it('should reject updating a nonexistent role', async () => {
    prismaMock.role.findUnique.mockResolvedValue(null);

    await expect(
      service.update(
        'missing-role',
        {} as UpdateRoleDto,
      ),
    ).rejects.toThrow(NotFoundException);

    expect(
      prismaMock.role.update,
    ).not.toHaveBeenCalled();
  });

  it('should propagate database errors', async () => {
    prismaMock.role.findMany.mockRejectedValue(
      new Error('Database query failed'),
    );

    await expect(
      service.findAll(),
    ).rejects.toThrow('Database query failed');
  });
});
