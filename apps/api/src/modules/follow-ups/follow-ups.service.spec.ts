
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import { FollowUpsService } from './follow-ups.service.js';

import { PrismaService } from '../../database/prisma/prisma.service.js';

import { ScopeService } from '../auth/services/scope.service.js';

describe('FollowUpsService', () => {
  let service: FollowUpsService;

  const prismaMock = {
    user: {
      findFirst: vi.fn(),
    },
    product: {
      findFirst: vi.fn(),
    },
    activity: {
      findUnique: vi.fn(),
    },
    followUp: {
      create: vi.fn(),
    },
  };

  const scopeServiceMock = {
    assertBranchAccess: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();

    service = new FollowUpsService(
      prismaMock as unknown as PrismaService,
      scopeServiceMock as unknown as ScopeService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects creation when the assigned user does not exist', async () => {
    const dto = {
      assignedToUserId: 'missing-user',
    } as Parameters<FollowUpsService['create']>[0];

    const user = {
      id: 'manager-1',
    } as Parameters<FollowUpsService['create']>[1];

    prismaMock.user.findFirst.mockResolvedValue(null);

    await expect(
      service.create(dto, user),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'missing-user',
        deletedAt: null,
        status: 'ACTIVE',
      },
      include: {
        staffProfile: {
          include: {
            branch: {
              include: {
                district: true,
              },
            },
          },
        },
      },
    });

    expect(prismaMock.followUp.create).not.toHaveBeenCalled();
  });

  it('rejects an assigned user without a staff profile', async () => {
    const dto = {
      assignedToUserId: 'user-1',
    } as Parameters<FollowUpsService['create']>[0];

    const user = {
      id: 'manager-1',
    } as Parameters<FollowUpsService['create']>[1];

    prismaMock.user.findFirst.mockResolvedValue({
      id: 'user-1',
      staffProfile: null,
    });

    await expect(
      service.create(dto, user),
    ).rejects.toThrow(BadRequestException);

    expect(scopeServiceMock.assertBranchAccess).not.toHaveBeenCalled();
    expect(prismaMock.followUp.create).not.toHaveBeenCalled();
  });

  it('rejects follow-up creation when branch access is denied', async () => {
    const dto = {
      assignedToUserId: 'staff-1',
    } as Parameters<FollowUpsService['create']>[0];

    const user = {
      id: 'manager-1',
    } as Parameters<FollowUpsService['create']>[1];

    prismaMock.user.findFirst.mockResolvedValue({
      id: 'staff-1',
      staffProfile: {
        branchId: 'branch-1',
      },
    });

    scopeServiceMock.assertBranchAccess.mockRejectedValue(
      new Error('Branch access denied'),
    );

    await expect(
      service.create(dto, user),
    ).rejects.toThrow('Branch access denied');

    expect(scopeServiceMock.assertBranchAccess).toHaveBeenCalledWith(
      user,
      'branch-1',
    );

    expect(prismaMock.followUp.create).not.toHaveBeenCalled();
  });

  it('rejects an inactive or missing product', async () => {
    const dto = {
      assignedToUserId: 'staff-1',
      productId: 'missing-product',
    } as Parameters<FollowUpsService['create']>[0];

    const user = {
      id: 'manager-1',
    } as Parameters<FollowUpsService['create']>[1];

    prismaMock.user.findFirst.mockResolvedValue({
      id: 'staff-1',
      staffProfile: {
        branchId: 'branch-1',
      },
    });

    prismaMock.product.findFirst.mockResolvedValue(null);

    await expect(
      service.create(dto, user),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.product.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'missing-product',
        status: 'ACTIVE',
        deletedAt: null,
      },
    });

    expect(prismaMock.followUp.create).not.toHaveBeenCalled();
  });

  it('rejects a missing linked activity', async () => {
    const dto = {
      assignedToUserId: 'staff-1',
      activityId: 'missing-activity',
    } as Parameters<FollowUpsService['create']>[0];

    const user = {
      id: 'manager-1',
    } as Parameters<FollowUpsService['create']>[1];

    prismaMock.user.findFirst.mockResolvedValue({
      id: 'staff-1',
      staffProfile: {
        branchId: 'branch-1',
      },
    });

    prismaMock.activity.findUnique.mockResolvedValue(null);

    await expect(
      service.create(dto, user),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.activity.findUnique).toHaveBeenCalledWith({
      where: {
        id: 'missing-activity',
      },
    });

    expect(prismaMock.followUp.create).not.toHaveBeenCalled();
  });

  it('rejects a linked activity outside the authorized branch scope', async () => {
    const dto = {
      assignedToUserId: 'staff-1',
      activityId: 'activity-1',
    } as Parameters<FollowUpsService['create']>[0];

    const user = {
      id: 'manager-1',
    } as Parameters<FollowUpsService['create']>[1];

    prismaMock.user.findFirst.mockResolvedValue({
      id: 'staff-1',
      staffProfile: {
        branchId: 'branch-1',
      },
    });

    prismaMock.activity.findUnique.mockResolvedValue({
      id: 'activity-1',
      branchId: 'branch-2',
    });

    scopeServiceMock.assertBranchAccess.mockImplementation(
      async (_currentUser, branchId) => {
        if (branchId === 'branch-2') {
          throw new Error('Activity branch access denied');
        }
      },
    );

    await expect(
      service.create(dto, user),
    ).rejects.toThrow('Activity branch access denied');

    expect(scopeServiceMock.assertBranchAccess).toHaveBeenCalledWith(
      user,
      'branch-2',
    );

    expect(prismaMock.followUp.create).not.toHaveBeenCalled();
  });
});
