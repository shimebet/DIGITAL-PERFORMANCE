
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

import { FollowUpsService } from './follow-ups.service.js';

import type { PrismaService } from '../../database/prisma/prisma.service.js';
import type { ScopeService } from '../auth/services/scope.service.js';
import type {
  AuthenticatedUser,
  AuthenticatedUserRoleAssignment,
} from '../auth/interfaces/authenticated-user.interface.js';

describe('FollowUpsService status security', () => {
  const staffAssignment: AuthenticatedUserRoleAssignment = {
    roleCode: 'DIGITAL_RESKILLED_STAFF',
    scopeType: 'STAFF',
    regionId: null,
    districtId: null,
    branchId: null,
    permissions: ['followup.read', 'followup.update'],
  };

  const user: AuthenticatedUser = {
    id: 'staff-1',
    username: 'staff',
    mustChangePassword: false,
    firstName: 'Test',
    lastName: 'Staff',
    roles: ['DIGITAL_RESKILLED_STAFF'],
    permissions: ['followup.read', 'followup.update'],
    scopes: [
      {
        scopeType: 'STAFF',
        regionId: null,
        districtId: null,
        branchId: null,
      },
    ],
    roleAssignments: [staffAssignment],
  };

  const makeBranchManager = (
    id: string,
    branchId: string,
  ): AuthenticatedUser => ({
    id,
    username: id,
    mustChangePassword: false,
    firstName: 'Branch',
    lastName: 'Manager',
    roles: ['BRANCH_MANAGER'],
    permissions: ['followup.read', 'followup.update'],
    scopes: [
      {
        scopeType: 'BRANCH',
        regionId: null,
        districtId: null,
        branchId,
      },
    ],
    roleAssignments: [
      {
        roleCode: 'BRANCH_MANAGER',
        scopeType: 'BRANCH',
        regionId: null,
        districtId: null,
        branchId,
        permissions: ['followup.read', 'followup.update'],
      },
    ],
  });

  const followUp = {
    id: 'follow-up-1',
    branchId: 'branch-a',
    branch: {
      id: 'branch-a',
      districtId: 'district-a',
      district: {
        id: 'district-a',
        regionId: 'region-a',
      },
    },
    assignedToUserId: 'staff-1',
    createdByUserId: 'branch-manager-1',
    status: 'OPEN',
    isEnabled: true,
    deletedAt: null,
    completedAt: null,
    nextFollowUpDate: null,
  };

  const prismaMock = {
    followUp: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    followUpHistory: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  const scopeMock = {
    isGlobal: vi.fn(),
    assertBranchAccess: vi.fn(),
  };

  let service: FollowUpsService;

  beforeEach(() => {
    vi.resetAllMocks();

    prismaMock.followUp.findFirst.mockResolvedValue({
      ...followUp,
    });

    prismaMock.followUp.update.mockImplementation(
      async ({ data }) => ({
        ...followUp,
        ...data,
      }),
    );

    prismaMock.followUpHistory.create.mockResolvedValue({
      id: 'history-1',
    });

    prismaMock.$transaction.mockImplementation(
      async (callback) => callback(prismaMock),
    );

    scopeMock.isGlobal.mockReturnValue(false);
    scopeMock.assertBranchAccess.mockResolvedValue(undefined);

    service = new FollowUpsService(
      prismaMock as unknown as PrismaService,
      scopeMock as unknown as ScopeService,
    );
  });

  it('allows OPEN to CONTACTED', async () => {
    const result = await service.updateStatus(
      followUp.id,
      { status: 'CONTACTED' },
      user,
    );

    expect(result.status).toBe('CONTACTED');

    expect(prismaMock.followUp.update).toHaveBeenCalledOnce();

    expect(prismaMock.followUpHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        followUpId: followUp.id,
        changedByUserId: user.id,
        previousStatus: 'OPEN',
        newStatus: 'CONTACTED',
      }),
    });
  });

  it('rejects duplicate status updates', async () => {
    await expect(
      service.updateStatus(
        followUp.id,
        { status: 'OPEN' },
        user,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(prismaMock.followUp.update).not.toHaveBeenCalled();
  });

  it('rejects rescheduling without a date', async () => {
    await expect(
      service.updateStatus(
        followUp.id,
        { status: 'RESCHEDULED' },
        user,
      ),
    ).rejects.toThrow(
      'nextFollowUpDate is required when status is RESCHEDULED',
    );

    expect(prismaMock.followUp.update).not.toHaveBeenCalled();
  });

  it('allows rescheduling with a valid date', async () => {
    const result = await service.updateStatus(
      followUp.id,
      {
        status: 'RESCHEDULED',
        nextFollowUpDate: '2026-10-25',
      },
      user,
    );

    expect(result.status).toBe('RESCHEDULED');

    expect(prismaMock.followUp.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          nextFollowUpDate: new Date('2026-10-25'),
          completedAt: null,
        }),
      }),
    );
  });

  it('sets completedAt when converted', async () => {
    const result = await service.updateStatus(
      followUp.id,
      {
        status: 'CONVERTED',
        outcome: 'Customer activated CBE Birr',
      },
      user,
    );

    expect(result.status).toBe('CONVERTED');

    const args = prismaMock.followUp.update.mock.calls[0]?.[0];

    expect(args.data.completedAt).toBeInstanceOf(Date);

    expect(args.data.outcome).toBe(
      'Customer activated CBE Birr',
    );
  });

  it('rejects reopening completed follow-ups', async () => {
    prismaMock.followUp.findFirst.mockResolvedValue({
      ...followUp,
      status: 'CONVERTED',
      completedAt: new Date(),
    });

    await expect(
      service.updateStatus(
        followUp.id,
        { status: 'CONTACTED' },
        user,
      ),
    ).rejects.toThrow(
      'Completed follow-ups cannot change status',
    );

    expect(prismaMock.followUp.update).not.toHaveBeenCalled();
    expect(prismaMock.followUpHistory.create).not.toHaveBeenCalled();
  });

  it('rejects disabled follow-ups', async () => {
    prismaMock.followUp.findFirst.mockResolvedValue({
      ...followUp,
      isEnabled: false,
    });

    await expect(
      service.updateStatus(
        followUp.id,
        { status: 'CONTACTED' },
        user,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(prismaMock.followUp.update).not.toHaveBeenCalled();
  });

  it('records the actor, status change and note', async () => {
    await service.updateStatus(
      followUp.id,
      {
        status: 'CONTACTED',
        note: 'Customer contacted by phone',
      },
      user,
    );

    expect(prismaMock.followUpHistory.create).toHaveBeenCalledWith({
      data: {
        followUpId: followUp.id,
        changedByUserId: user.id,
        previousStatus: 'OPEN',
        newStatus: 'CONTACTED',
        note: 'Customer contacted by phone',
      },
    });
  });

  it('propagates an audit history failure from the transaction', async () => {
    prismaMock.followUpHistory.create.mockRejectedValue(
      new Error('Audit history failed'),
    );

    await expect(
      service.updateStatus(
        followUp.id,
        { status: 'CONTACTED' },
        user,
      ),
    ).rejects.toThrow('Audit history failed');

    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
  });

  it('rejects another ordinary staff member updating a follow-up', async () => {
    const otherStaff: AuthenticatedUser = {
      ...user,
      id: 'staff-2',
      username: 'other-staff',
    };

    await expect(
      service.updateStatus(
        followUp.id,
        { status: 'CONTACTED' },
        otherStaff,
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(prismaMock.followUp.update).not.toHaveBeenCalled();
    expect(prismaMock.followUpHistory.create).not.toHaveBeenCalled();
  });

  it('allows an authorized Branch Manager to update staff follow-ups', async () => {
    const branchManager = makeBranchManager(
      'branch-manager-1',
      'branch-a',
    );

    const result = await service.updateStatus(
      followUp.id,
      {
        status: 'CONTACTED',
        note: 'Updated by Branch Manager',
      },
      branchManager,
    );

    expect(result.status).toBe('CONTACTED');

    expect(prismaMock.followUpHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        changedByUserId: branchManager.id,
        previousStatus: 'OPEN',
        newStatus: 'CONTACTED',
      }),
    });
  });

  it('rejects a Branch Manager assigned to another branch', async () => {
    const branchManager = makeBranchManager(
      'branch-manager-2',
      'branch-b',
    );

    await expect(
      service.updateStatus(
        followUp.id,
        { status: 'CONTACTED' },
        branchManager,
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(prismaMock.followUp.update).not.toHaveBeenCalled();
    expect(prismaMock.followUpHistory.create).not.toHaveBeenCalled();
  });
});
