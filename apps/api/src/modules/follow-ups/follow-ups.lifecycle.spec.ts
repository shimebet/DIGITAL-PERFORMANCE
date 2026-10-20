import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { FollowUpsService } from './follow-ups.service.js';

import type { PrismaService } from '../../database/prisma/prisma.service.js';
import type { ScopeService } from '../auth/services/scope.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';

describe('FollowUpsService lifecycle authorization', () => {
  const user = {
    id: 'manager-1',
    username: 'manager',
    mustChangePassword: false,
    firstName: 'Test',
    lastName: 'Manager',
    roles: [],
    permissions: [],
    scopes: [],
    roleAssignments: [],
  } satisfies AuthenticatedUser;

  const prismaMock = {
    followUp: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    userRole: {
      findMany: vi.fn(),
    },
    branch: {
      findFirst: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  const scopeMock = {
    assertBranchAccess: vi.fn(),
  };

  let service: FollowUpsService;

  const branch = {
    id: 'branch-a',
    districtId: 'district-a',
    district: {
      regionId: 'region-a',
    },
  };

  const followUp = {
    id: 'follow-up-1',
    branchId: 'branch-a',
    isEnabled: true,
  };

  const assignment = (
    scopeType: 'GLOBAL' | 'REGION' | 'DISTRICT' | 'BRANCH',
    roleCode: string,
    ids: {
      regionId?: string;
      districtId?: string;
      branchId?: string;
    } = {},
  ) => ({
    scopeType,
    role: { code: roleCode },
    regionId: ids.regionId ?? null,
    districtId: ids.districtId ?? null,
    branchId: ids.branchId ?? null,
  });

  beforeEach(() => {
    vi.resetAllMocks();

    prismaMock.followUp.findFirst.mockResolvedValue(followUp);
    prismaMock.branch.findFirst.mockResolvedValue(branch);
    prismaMock.userRole.findMany.mockResolvedValue([]);

    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: typeof prismaMock) => Promise<unknown>) =>
        callback(prismaMock),
    );

    prismaMock.followUp.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.followUp.findUniqueOrThrow.mockResolvedValue({
      ...followUp,
      isEnabled: false,
      deletedAt: null,
    });

    prismaMock.auditLog.create.mockResolvedValue({ id: 'audit-1' });

    service = new FollowUpsService(
      prismaMock as unknown as PrismaService,
      scopeMock as unknown as ScopeService,
    );
  });

  it('rejects a missing follow-up', async () => {
    prismaMock.followUp.findFirst.mockResolvedValue(null);

    await expect(service.disable(followUp.id, user))
      .rejects.toThrow(NotFoundException);

    expect(prismaMock.userRole.findMany).not.toHaveBeenCalled();
  });

  it('rejects missing lifecycle permission assignments', async () => {
    await expect(service.disable(followUp.id, user))
      .rejects.toThrow(ForbiddenException);

    expect(prismaMock.followUp.updateMany).not.toHaveBeenCalled();
  });

  it('queries only active roles, active permissions, and valid assignments', async () => {
    await expect(service.disable(followUp.id, user))
      .rejects.toThrow(ForbiddenException);

    const query = prismaMock.userRole.findMany.mock.calls[0]?.[0];

    expect(query.where.userId).toBe(user.id);
    expect(query.where.role.status).toBe('ACTIVE');
    expect(query.where.role.rolePermissions.some.permission).toEqual({
      code: 'followup.manage',
      status: 'ACTIVE',
    });

    expect(query.where.OR).toEqual([
      { validFrom: null },
      { validFrom: { lte: expect.any(Date) } },
    ]);

    expect(query.where.AND).toEqual([
      {
        OR: [
          { validTo: null },
          { validTo: { gte: expect.any(Date) } },
        ],
      },
    ]);
  });

  it('rejects permission from an unrelated branch assignment', async () => {
    prismaMock.userRole.findMany.mockResolvedValue([
      assignment('BRANCH', 'BRANCH_MANAGER', {
        branchId: 'branch-b',
      }),
    ]);

    await expect(service.disable(followUp.id, user))
      .rejects.toThrow(ForbiddenException);

    expect(prismaMock.followUp.updateMany).not.toHaveBeenCalled();
  });

  it('rejects permission from an unrelated district assignment', async () => {
    prismaMock.userRole.findMany.mockResolvedValue([
      assignment('DISTRICT', 'DISTRICT_MANAGER', {
        districtId: 'district-b',
      }),
    ]);

    await expect(service.disable(followUp.id, user))
      .rejects.toThrow(ForbiddenException);
  });

  it('rejects permission from an unrelated region assignment', async () => {
    prismaMock.userRole.findMany.mockResolvedValue([
      assignment('REGION', 'REGIONAL_MANAGER', {
        regionId: 'region-b',
      }),
    ]);

    await expect(service.disable(followUp.id, user))
      .rejects.toThrow(ForbiddenException);
  });

  it('rejects a non-administrator GLOBAL assignment', async () => {
    prismaMock.userRole.findMany.mockResolvedValue([
      assignment('GLOBAL', 'BRANCH_MANAGER'),
    ]);

    await expect(service.disable(followUp.id, user))
      .rejects.toThrow(ForbiddenException);
  });

  it('allows a matching branch manager to disable a follow-up', async () => {
    prismaMock.userRole.findMany.mockResolvedValue([
      assignment('BRANCH', 'BRANCH_MANAGER', {
        branchId: 'branch-a',
      }),
    ]);

    const result = await service.disable(followUp.id, user);

    expect(result.isEnabled).toBe(false);

    expect(prismaMock.followUp.updateMany).toHaveBeenCalledWith({
      where: {
        id: followUp.id,
        deletedAt: null,
        isEnabled: true,
      },
      data: {
        isEnabled: false,
        disabledAt: expect.any(Date),
        disabledByUserId: user.id,
      },
    });

    expect(prismaMock.auditLog.create).toHaveBeenCalledOnce();
  });

  it('allows a matching district manager to disable a follow-up', async () => {
    prismaMock.userRole.findMany.mockResolvedValue([
      assignment('DISTRICT', 'DISTRICT_MANAGER', {
        districtId: 'district-a',
      }),
    ]);

    await expect(service.disable(followUp.id, user))
      .resolves.toBeDefined();
  });

  it('allows a matching regional manager to disable a follow-up', async () => {
    prismaMock.userRole.findMany.mockResolvedValue([
      assignment('REGION', 'REGIONAL_MANAGER', {
        regionId: 'region-a',
      }),
    ]);

    await expect(service.disable(followUp.id, user))
      .resolves.toBeDefined();
  });

  it('allows an authorized global administrator', async () => {
    prismaMock.userRole.findMany.mockResolvedValue([
      assignment('GLOBAL', 'SYSTEM_ADMIN'),
    ]);

    await expect(service.disable(followUp.id, user))
      .resolves.toBeDefined();
  });

  it('uses the delete permission for soft deletion', async () => {
    prismaMock.userRole.findMany.mockResolvedValue([
      assignment('GLOBAL', 'SYSTEM_ADMIN'),
    ]);

    await service.softDelete(followUp.id, user);

    const query = prismaMock.userRole.findMany.mock.calls[0]?.[0];

    expect(
      query.where.role.rolePermissions.some.permission.code,
    ).toBe('followup.delete');

    expect(prismaMock.followUp.updateMany).toHaveBeenCalledWith({
      where: {
        id: followUp.id,
        deletedAt: null,
      },
      data: {
        deletedAt: expect.any(Date),
        deletedByUserId: user.id,
      },
    });

    expect(prismaMock.auditLog.create).toHaveBeenCalledOnce();
  });

  it('rejects a conflicting lifecycle state change', async () => {
    prismaMock.userRole.findMany.mockResolvedValue([
      assignment('GLOBAL', 'SYSTEM_ADMIN'),
    ]);

    prismaMock.followUp.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.disable(followUp.id, user))
      .rejects.toThrow(BadRequestException);

    expect(prismaMock.auditLog.create).not.toHaveBeenCalled();
  });
});