import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NotFoundException } from '@nestjs/common';

import { TargetsService } from './targets.service.js';

import type { PrismaService } from '../../database/prisma/prisma.service.js';
import type { ScopeService } from '../auth/services/scope.service.js';

describe('TargetsService product lifecycle assignment', () => {
  const target = {
    id: 'target-1',
    status: 'ACTIVE',
    deletedAt: null,
    metricType: 'ACTIVATION',
    startDate: new Date('2026-10-01'),
    endDate: new Date('2026-10-31'),
  };

  const prismaMock = {
    target: {
      findFirst: vi.fn(),
    },
    product: {
      findFirst: vi.fn(),
    },
    targetAssignment: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  };

  const scopeMock = {
    isGlobal: vi.fn(),
  };

  const currentUser = {
    id: 'user-1',
  } as Parameters<TargetsService['assign']>[1];

  const makeDto = (productId?: string) =>
    ({
      targetId: target.id,
      scopeType: 'GLOBAL',
      targetValue: 100,
      ...(productId ? { productId } : {}),
    }) as Parameters<TargetsService['assign']>[0];

  let service: TargetsService;

  beforeEach(() => {
    vi.resetAllMocks();

    prismaMock.target.findFirst.mockResolvedValue(target);
    prismaMock.product.findFirst.mockResolvedValue({
      id: 'product-active',
    });
    prismaMock.targetAssignment.findFirst.mockResolvedValue(null);
    prismaMock.targetAssignment.create.mockResolvedValue({
      id: 'assignment-1',
      targetId: target.id,
    });

    scopeMock.isGlobal.mockReturnValue(true);

    service = new TargetsService(
      prismaMock as unknown as PrismaService,
      scopeMock as unknown as ScopeService,
    );
  });

  it('accepts an active product', async () => {
    await expect(
      service.assign(makeDto('product-active'), currentUser),
    ).resolves.toBeDefined();

    expect(prismaMock.product.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'product-active',
        deletedAt: null,
        status: 'ACTIVE',
      },
    });

    expect(prismaMock.targetAssignment.create).toHaveBeenCalledOnce();
  });

  it('rejects an inactive product', async () => {
    prismaMock.product.findFirst.mockResolvedValue(null);

    await expect(
      service.assign(makeDto('product-inactive'), currentUser),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.product.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'product-inactive',
        deletedAt: null,
        status: 'ACTIVE',
      },
    });

    expect(prismaMock.targetAssignment.create).not.toHaveBeenCalled();
  });

  it('rejects a soft-deleted product', async () => {
    prismaMock.product.findFirst.mockResolvedValue(null);

    await expect(
      service.assign(makeDto('product-deleted'), currentUser),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.product.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'product-deleted',
        deletedAt: null,
        status: 'ACTIVE',
      },
    });

    expect(prismaMock.targetAssignment.create).not.toHaveBeenCalled();
  });

  it('rejects a nonexistent product', async () => {
    prismaMock.product.findFirst.mockResolvedValue(null);

    await expect(
      service.assign(makeDto('product-missing'), currentUser),
    ).rejects.toThrow('Product not found');

    expect(prismaMock.targetAssignment.create).not.toHaveBeenCalled();
  });

  it('allows assignments without a product', async () => {
    await expect(
      service.assign(makeDto(), currentUser),
    ).resolves.toBeDefined();

    expect(prismaMock.product.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.targetAssignment.create).toHaveBeenCalledOnce();
  });
});