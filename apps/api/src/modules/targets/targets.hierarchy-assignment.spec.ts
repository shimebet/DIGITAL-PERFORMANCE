
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';

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
// TARGETS SERVICE - HIERARCHICAL ASSIGNMENT TESTS
// ============================================================================

describe('TargetsService hierarchical assignments', () => {
  // ==========================================================================
  // TEST TARGET
  // ==========================================================================

  const target = {
    id: 'target-1',
    status: 'ACTIVE',
    deletedAt: null,
    metricType: 'ACTIVATION',
    startDate: new Date('2026-10-01'),
    endDate: new Date('2026-10-31'),
  };

  // ==========================================================================
  // PARENT TARGET ASSIGNMENT
  // ==========================================================================

  const parent = {
    id: 'global-assignment-1',
    targetId: target.id,
    scopeType: 'GLOBAL',
    regionId: null,
    districtId: null,
    branchId: null,
    userId: null,
    productId: null,
    targetValue: '1000.00',
  };

  // ==========================================================================
  // PRISMA MOCK
  //
  // Transaction methods belong at the top level.
  // No duplicate object properties.
  // ==========================================================================

  const prismaMock = {
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),

    target: {
      findFirst: vi.fn(),
    },

    product: {
      findFirst: vi.fn(),
    },

    district: {
      findFirst: vi.fn(),
    },

    branch: {
      findFirst: vi.fn(),
    },

    user: {
      findFirst: vi.fn(),
    },

    targetAssignment: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      aggregate: vi.fn(),
      create: vi.fn(),
    },
  };

  // ==========================================================================
  // SCOPE SERVICE MOCK
  // ==========================================================================

  const scopeMock = {
    isGlobal: vi.fn(),
    assertRegionAccess: vi.fn(),
    assertDistrictAccess: vi.fn(),
    assertBranchAccess: vi.fn(),
  };

  // ==========================================================================
  // AUTHENTICATED SUPER ADMINISTRATOR
  // ==========================================================================

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

  // ==========================================================================
  // SERVICE INSTANCE
  // ==========================================================================

  let service: TargetsService;

  // ==========================================================================
  // BEFORE EACH TEST
  // ==========================================================================

  beforeEach(() => {
    vi.resetAllMocks();

    // ------------------------------------------------------------------------
    // INTERACTIVE PRISMA TRANSACTION
    // ------------------------------------------------------------------------

    prismaMock.$transaction.mockImplementation(
      async (
        callback: (
          tx: typeof prismaMock,
        ) => Promise<unknown>,
      ) => callback(prismaMock),
    );

    // ------------------------------------------------------------------------
    // DATABASE ROW LOCK
    // ------------------------------------------------------------------------

    prismaMock.$queryRaw.mockResolvedValue([
      { id: target.id },
    ]);

    // ------------------------------------------------------------------------
    // ACTIVE TARGET
    // ------------------------------------------------------------------------

    prismaMock.target.findFirst.mockResolvedValue(
      target,
    );

    // ------------------------------------------------------------------------
    // ACTIVE PRODUCT
    // ------------------------------------------------------------------------

    prismaMock.product.findFirst.mockResolvedValue({
      id: 'product-active',
    });

    // ------------------------------------------------------------------------
    // DISTRICT RECORD
    // ------------------------------------------------------------------------

    prismaMock.district.findFirst.mockResolvedValue({
      id: 'district-1',
      regionId: 'region-1',
      deletedAt: null,
    });

    // ------------------------------------------------------------------------
    // BRANCH RECORD WITH DISTRICT
    // ------------------------------------------------------------------------

    prismaMock.branch.findFirst.mockResolvedValue({
      id: 'branch-1',
      districtId: 'district-1',
      deletedAt: null,

      district: {
        id: 'district-1',
        regionId: 'region-1',
      },
    });

    // ------------------------------------------------------------------------
    // USER RECORD
    //
    // STAFF validation may require a nested staffProfile.
    // We will configure that after reviewing the full STAFF logic.
    // ------------------------------------------------------------------------

   prismaMock.user.findFirst.mockResolvedValue({
  id: 'staff-1',
  status: 'ACTIVE',
  deletedAt: null,
  staffProfile: {
    branchId: 'branch-1',
    branch: {
      id: 'branch-1',
      districtId: 'district-1',
      district: {
        id: 'district-1',
        regionId: 'region-1',
      },
    },
  },
});

    // ------------------------------------------------------------------------
    // PARENT ASSIGNMENT
    // ------------------------------------------------------------------------

    prismaMock.targetAssignment.findUnique.mockResolvedValue(
      parent,
    );

    // ------------------------------------------------------------------------
    // NO DUPLICATE OR OVERLAPPING ASSIGNMENTS
    // ------------------------------------------------------------------------

    prismaMock.targetAssignment.findFirst.mockResolvedValue(
      null,
    );

    // ------------------------------------------------------------------------
    // EXISTING CHILD ALLOCATION = 200
    // PARENT CAPACITY = 1000
    // REMAINING CAPACITY = 800
    // ------------------------------------------------------------------------

    prismaMock.targetAssignment.aggregate.mockResolvedValue({
      _sum: {
        targetValue: '200.00',
      },
    });

    // ------------------------------------------------------------------------
    // SUCCESSFUL ASSIGNMENT CREATION
    // ------------------------------------------------------------------------

    prismaMock.targetAssignment.create.mockResolvedValue({
      id: 'assignment-new',
      targetId: target.id,
    });

    // ------------------------------------------------------------------------
    // AUTHORIZATION MOCKS
    // ------------------------------------------------------------------------

    scopeMock.isGlobal.mockReturnValue(true);

    scopeMock.assertRegionAccess.mockResolvedValue(
      undefined,
    );

    scopeMock.assertDistrictAccess.mockResolvedValue(
      undefined,
    );

    scopeMock.assertBranchAccess.mockResolvedValue(
      undefined,
    );

    // ------------------------------------------------------------------------
    // INITIALIZE TARGETS SERVICE
    // ------------------------------------------------------------------------

    service = new TargetsService(
      prismaMock as unknown as PrismaService,
      scopeMock as unknown as ScopeService,
    );
  });

  // ==========================================================================
  // TEST 1: REGION ASSIGNMENT REQUIRES PARENT
  // ==========================================================================

  it('rejects REGION assignment without parent', async () => {
    const dto = {
      targetId: target.id,
      scopeType: 'REGION',
      regionId: 'region-1',
      targetValue: 100,
    } as Parameters<TargetsService['assign']>[0];

    await expect(
      service.assign(dto, currentUser),
    ).rejects.toThrow(BadRequestException);

    expect(
      prismaMock.$transaction,
    ).not.toHaveBeenCalled();

    expect(
      prismaMock.targetAssignment.create,
    ).not.toHaveBeenCalled();
  });

  // ==========================================================================
  // TEST 2: GLOBAL ASSIGNMENT MUST NOT HAVE PARENT
  // ==========================================================================

  it('rejects GLOBAL assignment with parent', async () => {
    const dto = {
      targetId: target.id,
      scopeType: 'GLOBAL',
      parentAssignmentId: parent.id,
      targetValue: 100,
    } as Parameters<TargetsService['assign']>[0];

    await expect(
      service.assign(dto, currentUser),
    ).rejects.toThrow(BadRequestException);

    expect(
      prismaMock.targetAssignment.create,
    ).not.toHaveBeenCalled();
  });

  // ==========================================================================
  // TEST 3: PARENT CAPACITY MUST NOT BE EXCEEDED
  // ==========================================================================

  it('rejects an allocation that exceeds parent capacity', async () => {
    const dto = {
      targetId: target.id,
      scopeType: 'REGION',
      parentAssignmentId: parent.id,
      regionId: 'region-1',
      targetValue: 900,
    } as Parameters<TargetsService['assign']>[0];

    await expect(
      service.assign(dto, currentUser),
    ).rejects.toThrow(BadRequestException);

    expect(
      prismaMock.targetAssignment.aggregate,
    ).toHaveBeenCalledWith({
      where: {
        parentAssignmentId: parent.id,
      },
      _sum: {
        targetValue: true,
      },
    });

    expect(
      prismaMock.targetAssignment.create,
    ).not.toHaveBeenCalled();
  });

  // ==========================================================================
  // TEST 4: PARENT AND CHILD MUST BELONG TO SAME TARGET
  // ==========================================================================

  it('rejects an assignment whose parent belongs to another target', async () => {
    prismaMock.targetAssignment.findUnique.mockResolvedValue({
      ...parent,
      targetId: 'different-target',
    });

    const dto = {
      targetId: target.id,
      scopeType: 'REGION',
      parentAssignmentId: parent.id,
      regionId: 'region-1',
      targetValue: 100,
    } as Parameters<TargetsService['assign']>[0];

    await expect(
      service.assign(dto, currentUser),
    ).rejects.toThrow(BadRequestException);

    expect(
      prismaMock.targetAssignment.create,
    ).not.toHaveBeenCalled();
  });

  // ==========================================================================
  // TEST 5: DUPLICATE GLOBAL ASSIGNMENT
  // ==========================================================================

  it('rejects duplicate GLOBAL assignments', async () => {
    prismaMock.targetAssignment.findFirst.mockResolvedValue({
      id: 'existing-assignment',
    });

    const dto = {
      targetId: target.id,
      scopeType: 'GLOBAL',
      targetValue: 100,
    } as Parameters<TargetsService['assign']>[0];

    await expect(
      service.assign(dto, currentUser),
    ).rejects.toThrow(ConflictException);

    expect(
      prismaMock.targetAssignment.create,
    ).not.toHaveBeenCalled();
  });

  // ==========================================================================
  // TEST 6: SUCCESSFUL REGION ASSIGNMENT
  // ==========================================================================

  it('creates a REGION assignment under a GLOBAL parent', async () => {
    const dto = {
      targetId: target.id,
      scopeType: 'REGION',
      parentAssignmentId: parent.id,
      regionId: 'region-1',
      targetValue: 300,
    } as Parameters<TargetsService['assign']>[0];

    await expect(
      service.assign(dto, currentUser),
    ).resolves.toBeDefined();

    expect(
      prismaMock.targetAssignment.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          targetId: target.id,
          scopeType: 'REGION',
          parentAssignmentId: parent.id,
          regionId: 'region-1',
          targetValue: 300,
        }),
      }),
    );
  });

  // ==========================================================================
  // TEST 7: EXACT REMAINING CAPACITY
  // ==========================================================================

  it('accepts an allocation equal to remaining parent capacity', async () => {
    const dto = {
      targetId: target.id,
      scopeType: 'REGION',
      parentAssignmentId: parent.id,
      regionId: 'region-1',
      targetValue: 800,
    } as Parameters<TargetsService['assign']>[0];

    await expect(
      service.assign(dto, currentUser),
    ).resolves.toBeDefined();

    expect(
      prismaMock.targetAssignment.create,
    ).toHaveBeenCalledOnce();
  });

  // ==========================================================================
  // TEST 8: INVALID PARENT SCOPE
  // ==========================================================================

  it('rejects REGION assignment under a DISTRICT parent', async () => {
    prismaMock.targetAssignment.findUnique.mockResolvedValue({
      ...parent,
      scopeType: 'DISTRICT',
      regionId: 'region-1',
      districtId: 'district-1',
    });

    const dto = {
      targetId: target.id,
      scopeType: 'REGION',
      parentAssignmentId: parent.id,
      regionId: 'region-1',
      targetValue: 100,
    } as Parameters<TargetsService['assign']>[0];

    await expect(
      service.assign(dto, currentUser),
    ).rejects.toThrow(BadRequestException);

    expect(
      prismaMock.targetAssignment.create,
    ).not.toHaveBeenCalled();
  });

  // ==========================================================================
  // TEST 9: PARENT AND CHILD PRODUCT MUST MATCH
  // ==========================================================================

  it('rejects an assignment with a different product from its parent', async () => {
    const dto = {
      targetId: target.id,
      scopeType: 'REGION',
      parentAssignmentId: parent.id,
      regionId: 'region-1',
      productId: 'product-active',
      targetValue: 100,
    } as Parameters<TargetsService['assign']>[0];

    await expect(
      service.assign(dto, currentUser),
    ).rejects.toThrow(BadRequestException);

    expect(
      prismaMock.targetAssignment.create,
    ).not.toHaveBeenCalled();
  });

  // ==========================================================================
  // TEST 10: SUCCESSFUL DISTRICT ASSIGNMENT
  // ==========================================================================

  it('creates a DISTRICT assignment under a matching REGION parent', async () => {
    prismaMock.targetAssignment.findUnique.mockResolvedValue({
      ...parent,
      id: 'region-assignment-1',
      scopeType: 'REGION',
      regionId: 'region-1',
    });

    const dto = {
      targetId: target.id,
      scopeType: 'DISTRICT',
      parentAssignmentId: 'region-assignment-1',
      districtId: 'district-1',
      targetValue: 300,
    } as Parameters<TargetsService['assign']>[0];

    await expect(
      service.assign(dto, currentUser),
    ).resolves.toBeDefined();

    expect(prismaMock.targetAssignment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          scopeType: 'DISTRICT',
          parentAssignmentId: 'region-assignment-1',
          regionId: 'region-1',
          districtId: 'district-1',
          targetValue: 300,
        }),
      }),
    );
  });

  // ==========================================================================
  // TEST 11: DISTRICT MUST MATCH PARENT REGION
  // ==========================================================================

  it('rejects DISTRICT assignment under another region', async () => {
    prismaMock.targetAssignment.findUnique.mockResolvedValue({
      ...parent,
      id: 'region-assignment-2',
      scopeType: 'REGION',
      regionId: 'different-region',
    });

    const dto = {
      targetId: target.id,
      scopeType: 'DISTRICT',
      parentAssignmentId: 'region-assignment-2',
      districtId: 'district-1',
      targetValue: 100,
    } as Parameters<TargetsService['assign']>[0];

    await expect(
      service.assign(dto, currentUser),
    ).rejects.toThrow(BadRequestException);

    expect(prismaMock.targetAssignment.create).not.toHaveBeenCalled();
  });

  // ==========================================================================
  // TEST 12: SUCCESSFUL BRANCH ASSIGNMENT
  // ==========================================================================

  it('creates a BRANCH assignment under a matching DISTRICT parent', async () => {
    prismaMock.targetAssignment.findUnique.mockResolvedValue({
      ...parent,
      id: 'district-assignment-1',
      scopeType: 'DISTRICT',
      regionId: 'region-1',
      districtId: 'district-1',
    });

    const dto = {
      targetId: target.id,
      scopeType: 'BRANCH',
      parentAssignmentId: 'district-assignment-1',
      branchId: 'branch-1',
      targetValue: 300,
    } as Parameters<TargetsService['assign']>[0];

    await expect(
      service.assign(dto, currentUser),
    ).resolves.toBeDefined();

    expect(prismaMock.targetAssignment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          scopeType: 'BRANCH',
          parentAssignmentId: 'district-assignment-1',
          regionId: 'region-1',
          districtId: 'district-1',
          branchId: 'branch-1',
          targetValue: 300,
        }),
      }),
    );
  });

  // ==========================================================================
  // TEST 13: BRANCH MUST MATCH PARENT DISTRICT
  // ==========================================================================

  it('rejects BRANCH assignment under another district', async () => {
    prismaMock.targetAssignment.findUnique.mockResolvedValue({
      ...parent,
      id: 'district-assignment-2',
      scopeType: 'DISTRICT',
      regionId: 'region-1',
      districtId: 'different-district',
    });

    const dto = {
      targetId: target.id,
      scopeType: 'BRANCH',
      parentAssignmentId: 'district-assignment-2',
      branchId: 'branch-1',
      targetValue: 100,
    } as Parameters<TargetsService['assign']>[0];

    await expect(
      service.assign(dto, currentUser),
    ).rejects.toThrow(BadRequestException);

    expect(prismaMock.targetAssignment.create).not.toHaveBeenCalled();
  });

  // ==========================================================================
  // TEST 14: SUCCESSFUL STAFF ASSIGNMENT
  // ==========================================================================

  it('creates a STAFF assignment under a matching BRANCH parent', async () => {
    prismaMock.targetAssignment.findUnique.mockResolvedValue({
      ...parent,
      id: 'branch-assignment-1',
      scopeType: 'BRANCH',
      regionId: 'region-1',
      districtId: 'district-1',
      branchId: 'branch-1',
    });

    const dto = {
      targetId: target.id,
      scopeType: 'STAFF',
      parentAssignmentId: 'branch-assignment-1',
      userId: 'staff-1',
      targetValue: 300,
    } as Parameters<TargetsService['assign']>[0];

    await expect(
      service.assign(dto, currentUser),
    ).resolves.toBeDefined();

    expect(prismaMock.targetAssignment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          scopeType: 'STAFF',
          parentAssignmentId: 'branch-assignment-1',
          regionId: 'region-1',
          districtId: 'district-1',
          branchId: 'branch-1',
          userId: 'staff-1',
          targetValue: 300,
        }),
      }),
    );
  });

  // ==========================================================================
  // TEST 15: STAFF MUST MATCH PARENT BRANCH
  // ==========================================================================

  it('rejects STAFF assignment under another branch', async () => {
    prismaMock.targetAssignment.findUnique.mockResolvedValue({
      ...parent,
      id: 'branch-assignment-2',
      scopeType: 'BRANCH',
      regionId: 'region-1',
      districtId: 'district-1',
      branchId: 'different-branch',
    });

    const dto = {
      targetId: target.id,
      scopeType: 'STAFF',
      parentAssignmentId: 'branch-assignment-2',
      userId: 'staff-1',
      targetValue: 100,
    } as Parameters<TargetsService['assign']>[0];

    await expect(
      service.assign(dto, currentUser),
    ).rejects.toThrow(BadRequestException);

    expect(prismaMock.targetAssignment.create).not.toHaveBeenCalled();
  });

});
