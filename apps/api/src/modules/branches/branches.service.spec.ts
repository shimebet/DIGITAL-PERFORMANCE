
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { BranchesService } from './branches.service.js';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { ScopeService } from '../auth/services/scope.service.js';

describe('BranchesService', () => {
  let service: BranchesService;

  const prismaMock = {
    district: {
      findFirst: vi.fn(),
    },
    branch: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  };

  const scopeServiceMock = {};

  beforeEach(() => {
    vi.resetAllMocks();

    service = new BranchesService(
      prismaMock as unknown as PrismaService,
      scopeServiceMock as ScopeService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects creating a branch when the district does not exist', async () => {
    prismaMock.district.findFirst.mockResolvedValue(null);

    await expect(
      service.create({
        code: 'BR001',
        name: 'Test Branch',
        districtId: 'missing-district',
      }),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.branch.create).not.toHaveBeenCalled();
  });

  it('rejects duplicate branch codes', async () => {
    prismaMock.district.findFirst.mockResolvedValue({
      id: 'district-1',
      deletedAt: null,
    });

    prismaMock.branch.findUnique.mockResolvedValue({
      id: 'existing-branch',
      code: 'BR001',
    });

    await expect(
      service.create({
        code: ' br001 ',
        name: 'Test Branch',
        districtId: 'district-1',
      }),
    ).rejects.toThrow(ConflictException);

    expect(prismaMock.branch.findUnique).toHaveBeenCalledWith({
      where: {
        code: 'BR001',
      },
    });

    expect(prismaMock.branch.create).not.toHaveBeenCalled();
  });

  it('creates a branch with normalized fields and default timezone', async () => {
    prismaMock.district.findFirst.mockResolvedValue({
      id: 'district-1',
      deletedAt: null,
    });

    prismaMock.branch.findUnique.mockResolvedValue(null);

    const expected = {
      id: 'branch-1',
      code: 'BR001',
      name: 'Test Branch',
      districtId: 'district-1',
      timezone: 'Africa/Addis_Ababa',
    };

    prismaMock.branch.create.mockResolvedValue(expected);

    const result = await service.create({
      code: ' br001 ',
      name: ' Test Branch ',
      districtId: 'district-1',
      email: ' TEST@EXAMPLE.COM ',
    });

    expect(prismaMock.branch.create).toHaveBeenCalledWith({
      data: {
        districtId: 'district-1',
        code: 'BR001',
        name: 'Test Branch',
        branchType: undefined,
        phone: undefined,
        email: 'test@example.com',
        address: undefined,
        timezone: 'Africa/Addis_Ababa',
      },
      include: {
        district: {
          include: {
            region: true,
          },
        },
      },
    });

    expect(result).toEqual(expected);
  });
});
