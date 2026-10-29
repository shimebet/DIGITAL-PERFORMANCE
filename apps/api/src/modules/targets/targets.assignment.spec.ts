
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NotFoundException } from '@nestjs/common';

import { TargetsService } from './targets.service.js';

import type {
  PrismaService,
} from '../../database/prisma/prisma.service.js';

import type {
  ScopeService,
} from '../auth/services/scope.service.js';

import type {
  AuthenticatedUser,
} from '../auth/interfaces/authenticated-user.interface.js';

// ============================================================================
// TARGET ASSIGNMENT PRODUCT LIFECYCLE TESTS
// ============================================================================

describe('TargetsService product lifecycle assignment', () => {
  // --------------------------------------------------------------------------
  // TEST TARGET
  // --------------------------------------------------------------------------

  const target = {
    id: 'target-1',
    status: 'ACTIVE',
    deletedAt: null,
    metricType: 'ACTIVATION',
    startDate: new Date('2026-10-01'),
    endDate: new Date('2026-10-31'),
  };

  // --------------------------------------------------------------------------
  // PRISMA MOCK
  //
  // IMPORTANT:
  // $transaction and $queryRaw belong at the Prisma client level.
  // They must NOT be placed inside target, product, or targetAssignment.
  // --------------------------------------------------------------------------

  const prismaMock = {
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),

    target: {
      findFirst: vi.fn(),
    },

    product: {
      findFirst: vi.fn(),
    },

    targetAssignment: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      aggregate: vi.fn(),
      create: vi.fn(),
    },
  };

  // --------------------------------------------------------------------------
  // SCOPE MOCK
  // --------------------------------------------------------------------------

  const scopeMock = {
    isGlobal: vi.fn(),
  };

  // --------------------------------------------------------------------------
  // AUTHENTICATED SUPER ADMINISTRATOR
  // --------------------------------------------------------------------------

  const currentUser = {
    id: 'admin-1',
    username: 'test-admin',
    firstName: 'Test',
    lastName: 'Admin',
    mustChangePassword: false,

    roles: ['SUPER_ADMIN'],
    permissions: ['target.create'],

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
        permissions: ['target.create'],
      },
    ],
  } satisfies AuthenticatedUser;

  // --------------------------------------------------------------------------
  // ASSIGNMENT DTO FACTORY
  // --------------------------------------------------------------------------

  const makeDto = (productId?: string) =>
    ({
      targetId: target.id,
      scopeType: 'GLOBAL',
      targetValue: 100,
      ...(productId ? { productId } : {}),
    }) as Parameters<TargetsService['assign']>[0];

  let service: TargetsService;

  // --------------------------------------------------------------------------
  // BEFORE EACH TEST
  // --------------------------------------------------------------------------

  beforeEach(() => {
    vi.resetAllMocks();

    // Simulate Prisma interactive transactions.
    // The callback receives the mocked transaction client.
    prismaMock.$transaction.mockImplementation(
      async (
        callback: (tx: typeof prismaMock) => Promise<unknown>,
      ) => callback(prismaMock),
    );

    // Simulate successful SELECT ... FOR UPDATE
    // against the target record.
    prismaMock.$queryRaw.mockResolvedValue([
      { id: target.id },
    ]);

    // Default active target.
    prismaMock.target.findFirst.mockResolvedValue(target);

    // Default active product.
    prismaMock.product.findFirst.mockResolvedValue({
      id: 'product-active',
    });

    // No duplicate or overlapping assignment by default.
    prismaMock.targetAssignment.findFirst.mockResolvedValue(null);

    // No parent is required for GLOBAL assignments.
    prismaMock.targetAssignment.findUnique.mockResolvedValue(null);

    // No existing child allocations.
    prismaMock.targetAssignment.aggregate.mockResolvedValue({
      _sum: {
        targetValue: null,
      },
    });

    // Default successful assignment creation.
    prismaMock.targetAssignment.create.mockResolvedValue({
      id: 'assignment-1',
      targetId: target.id,
      scopeType: 'GLOBAL',
      parentAssignmentId: null,
      targetValue: 100,
    });

    scopeMock.isGlobal.mockReturnValue(true);

    service = new TargetsService(
      prismaMock as unknown as PrismaService,
      scopeMock as unknown as ScopeService,
    );
  });

  // --------------------------------------------------------------------------
  // 1. ACCEPT ACTIVE PRODUCT
  // --------------------------------------------------------------------------

  it('accepts an active product', async () => {
    await expect(
      service.assign(
        makeDto('product-active'),
        currentUser,
      ),
    ).resolves.toBeDefined();

    expect(
      prismaMock.product.findFirst,
    ).toHaveBeenCalledWith({
      where: {
        id: 'product-active',
        deletedAt: null,
        status: 'ACTIVE',
      },
    });

    expect(
      prismaMock.$transaction,
    ).toHaveBeenCalledOnce();

    expect(
      prismaMock.targetAssignment.create,
    ).toHaveBeenCalledOnce();

    expect(
      prismaMock.targetAssignment.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          targetId: target.id,
          scopeType: 'GLOBAL',
          productId: 'product-active',
          parentAssignmentId: null,
          targetValue: 100,
        }),
      }),
    );
  });

  // --------------------------------------------------------------------------
  // 2. REJECT INACTIVE PRODUCT
  // --------------------------------------------------------------------------

  it('rejects an inactive product', async () => {
    prismaMock.product.findFirst.mockResolvedValue(null);

    await expect(
      service.assign(
        makeDto('product-inactive'),
        currentUser,
      ),
    ).rejects.toThrow(NotFoundException);

    expect(
      prismaMock.product.findFirst,
    ).toHaveBeenCalledWith({
      where: {
        id: 'product-inactive',
        deletedAt: null,
        status: 'ACTIVE',
      },
    });

    expect(
      prismaMock.targetAssignment.create,
    ).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // 3. REJECT SOFT-DELETED PRODUCT
  // --------------------------------------------------------------------------

  it('rejects a soft-deleted product', async () => {
    prismaMock.product.findFirst.mockResolvedValue(null);

    await expect(
      service.assign(
        makeDto('product-deleted'),
        currentUser,
      ),
    ).rejects.toThrow(NotFoundException);

    expect(
      prismaMock.product.findFirst,
    ).toHaveBeenCalledWith({
      where: {
        id: 'product-deleted',
        deletedAt: null,
        status: 'ACTIVE',
      },
    });

    expect(
      prismaMock.targetAssignment.create,
    ).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // 4. REJECT NONEXISTENT PRODUCT
  // --------------------------------------------------------------------------

  it('rejects a nonexistent product', async () => {
    prismaMock.product.findFirst.mockResolvedValue(null);

    await expect(
      service.assign(
        makeDto('product-missing'),
        currentUser,
      ),
    ).rejects.toThrow('Product not found');

    expect(
      prismaMock.targetAssignment.create,
    ).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // 5. ALLOW ASSIGNMENT WITHOUT PRODUCT
  // --------------------------------------------------------------------------

  it('allows assignments without a product', async () => {
    await expect(
      service.assign(
        makeDto(),
        currentUser,
      ),
    ).resolves.toBeDefined();

    expect(
      prismaMock.product.findFirst,
    ).not.toHaveBeenCalled();

    expect(
      prismaMock.targetAssignment.create,
    ).toHaveBeenCalledOnce();

    expect(
      prismaMock.targetAssignment.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          targetId: target.id,
          scopeType: 'GLOBAL',
          parentAssignmentId: null,
          targetValue: 100,
        }),
      }),
    );
  });
});
