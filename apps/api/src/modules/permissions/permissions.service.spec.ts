
import {
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
  PermissionsService,
} from './permissions.service.js';

import {
  PrismaService,
} from '../../database/prisma/prisma.service.js';

describe('PermissionsService', () => {
  let service: PermissionsService;

  const prismaMock = {
    permission: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.resetAllMocks();

    service = new PermissionsService(
      prismaMock as unknown as PrismaService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return all permissions sorted by module and action', async () => {
    const permissions = [
      {
        id: 'permission-1',
        module: 'roles',
        action: 'create',
      },
      {
        id: 'permission-2',
        module: 'users',
        action: 'read',
      },
    ];

    prismaMock.permission.findMany.mockResolvedValue(
      permissions,
    );

    const result = await service.findAll();

    expect(
      prismaMock.permission.findMany,
    ).toHaveBeenCalledWith({
      orderBy: [
        {
          module: 'asc',
        },
        {
          action: 'asc',
        },
      ],
    });

    expect(result).toEqual(permissions);
  });

  it('should return a permission by ID', async () => {
    const permission = {
      id: 'permission-1',
      module: 'users',
      action: 'read',
    };

    prismaMock.permission.findUnique.mockResolvedValue(
      permission,
    );

    const result = await service.findOne(
      'permission-1',
    );

    expect(
      prismaMock.permission.findUnique,
    ).toHaveBeenCalledWith({
      where: {
        id: 'permission-1',
      },
    });

    expect(result).toEqual(permission);
  });

  it('should throw NotFoundException when permission does not exist', async () => {
    prismaMock.permission.findUnique.mockResolvedValue(
      null,
    );

    await expect(
      service.findOne('missing-permission'),
    ).rejects.toThrow(NotFoundException);

    expect(
      prismaMock.permission.findUnique,
    ).toHaveBeenCalledWith({
      where: {
        id: 'missing-permission',
      },
    });
  });

  it('should return permissions filtered by module', async () => {
    const permissions = [
      {
        id: 'permission-1',
        module: 'users',
        action: 'create',
      },
      {
        id: 'permission-2',
        module: 'users',
        action: 'read',
      },
    ];

    prismaMock.permission.findMany.mockResolvedValue(
      permissions,
    );

    const result = await service.findByModule(
      'users',
    );

    expect(
      prismaMock.permission.findMany,
    ).toHaveBeenCalledWith({
      where: {
        module: 'users',
      },
      orderBy: {
        action: 'asc',
      },
    });

    expect(result).toEqual(permissions);
  });

  it('should return an empty array when a module has no permissions', async () => {
    prismaMock.permission.findMany.mockResolvedValue(
      [],
    );

    const result = await service.findByModule(
      'unknown-module',
    );

    expect(result).toEqual([]);
  });

  it('should propagate Prisma errors', async () => {
    prismaMock.permission.findMany.mockRejectedValue(
      new Error('Database query failed'),
    );

    await expect(
      service.findAll(),
    ).rejects.toThrow('Database query failed');
  });
});
