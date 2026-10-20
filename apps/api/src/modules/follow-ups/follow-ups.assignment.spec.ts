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

describe('FollowUpsService general update security', () => {
  const user = {
    id: 'staff-1',
    username: 'staff',
    mustChangePassword: false,
    firstName: 'Test',
    lastName: 'Staff',
    roles: [],
    permissions: [],
    scopes: [],
    roleAssignments: [],
  } satisfies AuthenticatedUser;

  const followUp = {
    id: 'follow-up-1',
    branchId: 'branch-a',
    assignedToUserId: 'staff-1',
    isEnabled: true,
    deletedAt: null,
  };

  const prismaMock = {
    followUp: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
    product: {
      findFirst: vi.fn(),
    },
  };

  const scopeMock = {
    isGlobal: vi.fn(),
    assertBranchAccess: vi.fn(),
  };

  let service: FollowUpsService;

  beforeEach(() => {
    vi.resetAllMocks();

    scopeMock.isGlobal.mockReturnValue(true);

    prismaMock.followUp.findFirst.mockResolvedValue(followUp);

    prismaMock.followUp.update.mockResolvedValue({
      ...followUp,
      remarks: 'Updated remarks',
    });

    service = new FollowUpsService(
      prismaMock as unknown as PrismaService,
      scopeMock as unknown as ScopeService,
    );
  });

  it('allows ordinary updates without changing assignment', async () => {
    await expect(
      service.update(
        followUp.id,
        { remarks: 'Updated remarks' },
        user,
      ),
    ).resolves.toMatchObject({
      remarks: 'Updated remarks',
    });

    expect(prismaMock.followUp.update).toHaveBeenCalledOnce();

    const updateArgs =
      prismaMock.followUp.update.mock.calls[0]?.[0] as
        | { data: Record<string, unknown> }
        | undefined;

    expect(updateArgs?.data).not.toHaveProperty(
      'assignedToUserId',
    );
  });

  it('accepts an active product during update', async () => {
    prismaMock.product.findFirst.mockResolvedValue({
      id: 'product-active',
    });

    await expect(
      service.update(
        followUp.id,
        { productId: 'product-active' },
        user,
      ),
    ).resolves.toBeDefined();

    expect(prismaMock.product.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'product-active',
        status: 'ACTIVE',
        deletedAt: null,
      },
      select: { id: true },
    });

    expect(prismaMock.followUp.update).toHaveBeenCalledOnce();
  });

  it('rejects an inactive product during update', async () => {
    prismaMock.product.findFirst.mockResolvedValue(null);

    await expect(
      service.update(
        followUp.id,
        { productId: 'product-inactive' },
        user,
      ),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.product.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'product-inactive',
        status: 'ACTIVE',
        deletedAt: null,
      },
      select: { id: true },
    });

    expect(prismaMock.followUp.update).not.toHaveBeenCalled();
  });

  it('rejects a soft-deleted product during update', async () => {
    prismaMock.product.findFirst.mockResolvedValue(null);

    await expect(
      service.update(
        followUp.id,
        { productId: 'product-deleted' },
        user,
      ),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.product.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'product-deleted',
        status: 'ACTIVE',
        deletedAt: null,
      },
      select: { id: true },
    });

    expect(prismaMock.followUp.update).not.toHaveBeenCalled();
  });

  it('rejects a nonexistent product during update', async () => {
    prismaMock.product.findFirst.mockResolvedValue(null);

    await expect(
      service.update(
        followUp.id,
        { productId: 'product-missing' },
        user,
      ),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.followUp.update).not.toHaveBeenCalled();
  });

  it('allows ordinary updates without product validation', async () => {
    await expect(
      service.update(
        followUp.id,
        { remarks: 'Updated remarks' },
        user,
      ),
    ).resolves.toBeDefined();

    expect(prismaMock.product.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.followUp.update).toHaveBeenCalledOnce();
  });
  it('rejects changing the assigned employee', async () => {
    await expect(
      service.update(
        followUp.id,
        { assignedToUserId: 'staff-2' },
        user,
      ),
    ).rejects.toThrow(
      'Use the dedicated reassignment endpoint',
    );

    expect(prismaMock.followUp.update).not.toHaveBeenCalled();
  });

  it('rejects assignment even when the value is unchanged', async () => {
    await expect(
      service.update(
        followUp.id,
        { assignedToUserId: 'staff-1' },
        user,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(prismaMock.followUp.update).not.toHaveBeenCalled();
  });

  it('rejects assignment when explicitly set to null', async () => {
    await expect(
      service.update(
        followUp.id,
        {
          assignedToUserId: null,
        } as unknown as Parameters<FollowUpsService['update']>[1],
        user,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(prismaMock.followUp.update).not.toHaveBeenCalled();
  });

  it('rejects assignment when explicitly set to an empty string', async () => {
    await expect(
      service.update(
        followUp.id,
        { assignedToUserId: '' },
        user,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(prismaMock.followUp.update).not.toHaveBeenCalled();
  });

  it('rejects updates to disabled follow-ups', async () => {
    prismaMock.followUp.findFirst.mockResolvedValue({
      ...followUp,
      isEnabled: false,
    });

    await expect(
      service.update(
        followUp.id,
        { remarks: 'Updated remarks' },
        user,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(prismaMock.followUp.update).not.toHaveBeenCalled();
  });

  it('rejects updates when branch access is denied', async () => {
    prismaMock.followUp.findFirst.mockResolvedValue({
      ...followUp,
      assignedToUserId: 'another-staff',
      createdByUserId: 'another-creator',
    });

    scopeMock.isGlobal.mockReturnValue(false);

    scopeMock.assertBranchAccess.mockRejectedValue(
      new ForbiddenException('Access denied'),
    );

    await expect(
      service.update(
        followUp.id,
        { remarks: 'Updated remarks' },
        user,
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(prismaMock.followUp.update).not.toHaveBeenCalled();
  });
});
