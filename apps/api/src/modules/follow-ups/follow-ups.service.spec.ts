
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { FollowUpsService } from './follow-ups.service.js';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { ScopeService } from '../auth/services/scope.service.js';

type CreateDto = Parameters<FollowUpsService['create']>[0];
type CurrentUser = Parameters<FollowUpsService['create']>[1];

describe('FollowUpsService - creation security', () => {
  let service: FollowUpsService;

  const authorizedManager: CurrentUser = {
    id: 'manager-1',
    username: 'manager-1',
    firstName: 'Branch',
    lastName: 'Manager',
    roles: ['BRANCH_MANAGER'],
    permissions: ['followup.create'],
    scopes: [
      {
        scopeType: 'BRANCH',
        regionId: null,
        districtId: null,
        branchId: 'branch-1',
      },
    ],
    roleAssignments: [
      {
        roleCode: 'BRANCH_MANAGER',
        scopeType: 'BRANCH',
        regionId: null,
        districtId: null,
        branchId: 'branch-1',
        permissions: ['followup.create'],
      },
    ],
    mustChangePassword: false,
  };

  const assignedStaff = {
    id: 'staff-1',
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
  };

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
    followUpHistory: {
      create: vi.fn(),
    },
  };

  const scopeServiceMock = {
    assertBranchAccess: vi.fn(),
  };

  const makeDto = (
    overrides: Partial<CreateDto> = {},
  ): CreateDto =>
    ({
      assignedToUserId: 'staff-1',
      followUpDate: '2026-10-25',
      reason: 'Customer digital banking follow-up',
      priority: 'MEDIUM',
      ...overrides,
    }) as CreateDto;

  beforeEach(() => {
    vi.resetAllMocks();

    prismaMock.user.findFirst.mockResolvedValue(assignedStaff);

    prismaMock.product.findFirst.mockResolvedValue({
      id: 'product-1',
      status: 'ACTIVE',
      deletedAt: null,
    });

    prismaMock.followUp.create.mockResolvedValue({
      id: 'followup-1',
      branchId: 'branch-1',
      assignedToUserId: 'staff-1',
      status: 'OPEN',
    });

    prismaMock.followUpHistory.create.mockResolvedValue({
      id: 'history-1',
    });

    scopeServiceMock.assertBranchAccess.mockResolvedValue(
      undefined,
    );

    service = new FollowUpsService(
      prismaMock as unknown as PrismaService,
      scopeServiceMock as unknown as ScopeService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('allows an authorized branch manager to create a follow-up', async () => {
    const result = await service.create(
      makeDto(),
      authorizedManager,
    );

    expect(result).toEqual(
      expect.objectContaining({
        id: 'followup-1',
        branchId: 'branch-1',
        assignedToUserId: 'staff-1',
      }),
    );

    expect(prismaMock.followUp.create).toHaveBeenCalledOnce();

    expect(prismaMock.followUp.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          branchId: 'branch-1',
          assignedToUserId: 'staff-1',
          createdByUserId: 'manager-1',
          status: 'OPEN',
        }),
      }),
    );

    expect(
      prismaMock.followUpHistory.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          followUpId: 'followup-1',
          changedByUserId: 'manager-1',
          newStatus: 'OPEN',
        }),
      }),
    );
  });

  it('rejects creation when the assigned user does not exist', async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);

    await expect(
      service.create(
        makeDto({ assignedToUserId: 'missing-user' }),
        authorizedManager,
      ),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'missing-user',
          deletedAt: null,
          status: 'ACTIVE',
          roles: expect.any(Object),
          staffProfile: expect.any(Object),
        }),
      }),
    );

    expect(prismaMock.followUp.create).not.toHaveBeenCalled();
  });

  it('rejects an assigned user without a staff profile', async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      id: 'staff-1',
      staffProfile: null,
    });

    await expect(
      service.create(makeDto(), authorizedManager),
    ).rejects.toThrow(BadRequestException);

    expect(prismaMock.followUp.create).not.toHaveBeenCalled();
  });

  it('rejects creation outside the manager authorized branch', async () => {
    const user: CurrentUser = {
      ...authorizedManager,
      roleAssignments: [
        {
          roleCode: 'BRANCH_MANAGER',
          scopeType: 'BRANCH',
          regionId: null,
          districtId: null,
          branchId: 'branch-2',
          permissions: ['followup.create'],
        },
      ],
    };

    await expect(
      service.create(makeDto(), user),
    ).rejects.toThrow(ForbiddenException);

    expect(prismaMock.followUp.create).not.toHaveBeenCalled();
  });

  it('rejects creation when the manager lacks followup.create in the target branch', async () => {
    const user: CurrentUser = {
      ...authorizedManager,
      permissions: [],
      roleAssignments: [
        {
          roleCode: 'BRANCH_MANAGER',
          scopeType: 'BRANCH',
          regionId: null,
          districtId: null,
          branchId: 'branch-1',
          permissions: ['followup.read'],
        },
      ],
    };

    await expect(
      service.create(makeDto(), user),
    ).rejects.toThrow(ForbiddenException);

    expect(prismaMock.followUp.create).not.toHaveBeenCalled();
  });

  it('prevents permission and branch scope mixing across different role assignments', async () => {
    const user: CurrentUser = {
      ...authorizedManager,
      roles: ['BRANCH_MANAGER', 'READ_ONLY'],
      permissions: ['followup.create', 'followup.read'],
      roleAssignments: [
        {
          roleCode: 'BRANCH_MANAGER',
          scopeType: 'BRANCH',
          regionId: null,
          districtId: null,
          branchId: 'branch-2',
          permissions: ['followup.create'],
        },
        {
          roleCode: 'READ_ONLY',
          scopeType: 'BRANCH',
          regionId: null,
          districtId: null,
          branchId: 'branch-1',
          permissions: ['followup.read'],
        },
      ],
    };

    await expect(
      service.create(makeDto(), user),
    ).rejects.toThrow(ForbiddenException);

    expect(prismaMock.followUp.create).not.toHaveBeenCalled();
  });

  it('rejects creation by a Digital Reskilled Staff user without create permission', async () => {
    const user: CurrentUser = {
      ...authorizedManager,
      id: 'staff-2',
      roles: ['DIGITAL_RESKILLED_STAFF'],
      permissions: ['followup.read', 'followup.update'],
      roleAssignments: [
        {
          roleCode: 'DIGITAL_RESKILLED_STAFF',
          scopeType: 'STAFF',
          regionId: null,
          districtId: null,
          branchId: 'branch-1',
          permissions: ['followup.read', 'followup.update'],
        },
      ],
    };

    await expect(
      service.create(makeDto(), user),
    ).rejects.toThrow(ForbiddenException);

    expect(prismaMock.followUp.create).not.toHaveBeenCalled();
  });

  it('allows an authorized district manager to create within their district', async () => {
    const user: CurrentUser = {
      ...authorizedManager,
      roles: ['DISTRICT_MANAGER'],
      roleAssignments: [
        {
          roleCode: 'DISTRICT_MANAGER',
          scopeType: 'DISTRICT',
          regionId: null,
          districtId: 'district-1',
          branchId: null,
          permissions: ['followup.create'],
        },
      ],
    };

    await service.create(makeDto(), user);

    expect(prismaMock.followUp.create).toHaveBeenCalledOnce();
  });

  it('rejects a district manager assigned to a different district', async () => {
    const user: CurrentUser = {
      ...authorizedManager,
      roles: ['DISTRICT_MANAGER'],
      roleAssignments: [
        {
          roleCode: 'DISTRICT_MANAGER',
          scopeType: 'DISTRICT',
          regionId: null,
          districtId: 'district-2',
          branchId: null,
          permissions: ['followup.create'],
        },
      ],
    };

    await expect(
      service.create(makeDto(), user),
    ).rejects.toThrow(ForbiddenException);

    expect(prismaMock.followUp.create).not.toHaveBeenCalled();
  });

  it('allows an authorized regional manager to create within their region', async () => {
    const user: CurrentUser = {
      ...authorizedManager,
      roles: ['REGIONAL_MANAGER'],
      roleAssignments: [
        {
          roleCode: 'REGIONAL_MANAGER',
          scopeType: 'REGION',
          regionId: 'region-1',
          districtId: null,
          branchId: null,
          permissions: ['followup.create'],
        },
      ],
    };

    await service.create(makeDto(), user);

    expect(prismaMock.followUp.create).toHaveBeenCalledOnce();
  });

  it('rejects a regional manager assigned to another region', async () => {
    const user: CurrentUser = {
      ...authorizedManager,
      roles: ['REGIONAL_MANAGER'],
      roleAssignments: [
        {
          roleCode: 'REGIONAL_MANAGER',
          scopeType: 'REGION',
          regionId: 'region-2',
          districtId: null,
          branchId: null,
          permissions: ['followup.create'],
        },
      ],
    };

    await expect(
      service.create(makeDto(), user),
    ).rejects.toThrow(ForbiddenException);

    expect(prismaMock.followUp.create).not.toHaveBeenCalled();
  });

  it('rejects an inactive or missing product', async () => {
    prismaMock.product.findFirst.mockResolvedValue(null);

    await expect(
      service.create(
        makeDto({ productId: 'missing-product' }),
        authorizedManager,
      ),
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
    prismaMock.activity.findUnique.mockResolvedValue(null);

    await expect(
      service.create(
        makeDto({ activityId: 'missing-activity' }),
        authorizedManager,
      ),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.activity.findUnique).toHaveBeenCalledWith({
      where: {
        id: 'missing-activity',
      },
    });

    expect(prismaMock.followUp.create).not.toHaveBeenCalled();
  });

  it('rejects a linked activity outside the assigned staff branch', async () => {
    prismaMock.activity.findUnique.mockResolvedValue({
      id: 'activity-1',
      branchId: 'branch-2',
    });

    await expect(
      service.create(
        makeDto({ activityId: 'activity-1' }),
        authorizedManager,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(prismaMock.followUp.create).not.toHaveBeenCalled();
  });

  it('rejects a linked activity when its branch access is denied', async () => {
    prismaMock.activity.findUnique.mockResolvedValue({
      id: 'activity-1',
      branchId: 'branch-1',
    });

    scopeServiceMock.assertBranchAccess.mockRejectedValue(
      new ForbiddenException('Activity branch access denied'),
    );

    await expect(
      service.create(
        makeDto({ activityId: 'activity-1' }),
        authorizedManager,
      ),
    ).rejects.toThrow('Activity branch access denied');

    expect(
      scopeServiceMock.assertBranchAccess,
    ).toHaveBeenCalledWith(
      authorizedManager,
      'branch-1',
    );

    expect(prismaMock.followUp.create).not.toHaveBeenCalled();
  });

  it('allows a valid linked activity in the assigned staff branch', async () => {
    prismaMock.activity.findUnique.mockResolvedValue({
      id: 'activity-1',
      branchId: 'branch-1',
    });

    await service.create(
      makeDto({ activityId: 'activity-1' }),
      authorizedManager,
    );

    expect(prismaMock.followUp.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          activityId: 'activity-1',
          branchId: 'branch-1',
        }),
      }),
    );
  });
});
