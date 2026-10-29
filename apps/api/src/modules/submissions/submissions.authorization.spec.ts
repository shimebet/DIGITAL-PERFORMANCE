
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

import type {
  AuthenticatedUser,
  AuthenticatedUserRoleAssignment,
} from '../auth/interfaces/authenticated-user.interface.js';

import { SubmissionsService } from './submissions.service.js';

import type { PrismaService } from '../../database/prisma/prisma.service.js';

describe('SubmissionsService - manager authorization', () => {
  const submission = {
    id: 'submission-a',
    staffId: 'staff-a',
    branchId: 'branch-a',
    status: 'REVIEWED',
    branch: {
      districtId: 'district-a',
      district: {
        regionId: 'region-a',
      },
    },
  };

  const prisma = {
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
    dailySubmission: {
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  };

  let service: SubmissionsService;

  function makeUser(
    assignments: AuthenticatedUserRoleAssignment[],
    id = 'manager-a',
  ): AuthenticatedUser {
    return {
      id,
      username: id,
      mustChangePassword: false,
      firstName: 'Test',
      lastName: 'Manager',
      roles: assignments.map((a) => a.roleCode),
      permissions: assignments.flatMap(
        (a) => a.permissions ?? [],
      ),
      scopes: assignments.map(
        ({ scopeType, regionId, districtId, branchId }) => ({
          scopeType,
          regionId,
          districtId,
          branchId,
        }),
      ),
      roleAssignments: assignments,
    };
  }

  const regionalReadOnly: AuthenticatedUserRoleAssignment = {
    roleCode: 'REGIONAL_ANALYST',
    scopeType: 'REGION',
    regionId: 'region-a',
    districtId: null,
    branchId: null,
    permissions: ['submission.read'],
  };

  const otherBranchApprover: AuthenticatedUserRoleAssignment = {
    roleCode: 'BRANCH_MANAGER',
    scopeType: 'BRANCH',
    regionId: null,
    districtId: null,
    branchId: 'branch-b',
    permissions: ['submission.approve'],
  };

  beforeEach(() => {
    vi.resetAllMocks();

    service = new SubmissionsService(
      prisma as unknown as PrismaService,
    );

    vi.spyOn(service, 'findOne').mockResolvedValue(
      submission as Awaited<
        ReturnType<SubmissionsService['findOne']>
      >,
    );
  });

  async function expectDeniedWithoutMutation(
    operation: () => Promise<unknown>,
  ) {
    await expect(operation()).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.dailySubmission.update).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  }

  // ==========================================================
  // EXISTING AUTHORIZATION TESTS
  // ==========================================================

  it('denies approval using a read-only regional assignment', async () => {
    const user = makeUser([regionalReadOnly]);

    await expectDeniedWithoutMutation(() =>
      service.approve(submission.id, user),
    );
  });

  it('denies approval outside the assigned branch', async () => {
    const user = makeUser([otherBranchApprover]);

    await expectDeniedWithoutMutation(() =>
      service.approve(submission.id, user),
    );
  });

  it('denies cross-role permission and scope mixing', async () => {
    const user = makeUser([
      regionalReadOnly,
      otherBranchApprover,
    ]);

    await expectDeniedWithoutMutation(() =>
      service.approve(submission.id, user),
    );
  });

  it('denies review without review permission', async () => {
    const user = makeUser([{
      ...otherBranchApprover,
      branchId: 'branch-a',
    }]);

    await expectDeniedWithoutMutation(() =>
      service.review(submission.id, user),
    );
  });

  it('denies unauthorized return for correction', async () => {
    const user = makeUser([regionalReadOnly]);

    await expectDeniedWithoutMutation(() =>
      service.returnForCorrection(
        submission.id,
        'Correction required',
        user,
      ),
    );
  });

  it('denies approval when assignment permissions are missing', async () => {
    const user = makeUser([{
      ...otherBranchApprover,
      branchId: 'branch-a',
      permissions: undefined,
    }]);

    await expectDeniedWithoutMutation(() =>
      service.approve(submission.id, user),
    );
  });

  it('prevents approval of the manager own submission', async () => {
    const user = makeUser(
      [{
        ...otherBranchApprover,
        branchId: 'branch-a',
      }],
      submission.staffId,
    );

    await expectDeniedWithoutMutation(() =>
      service.approve(submission.id, user),
    );
  });

  // ==========================================================
  // NEW APPROVAL AUDIT TESTS
  // ==========================================================

  it('creates an audit record when an authorized manager approves', async () => {
    const user = makeUser([{
      ...otherBranchApprover,
      branchId: 'branch-a',
    }]);

    const approvedSubmission = {
      ...submission,
      status: 'APPROVED',
      approvedByUserId: user.id,
    };

    prisma.$transaction.mockImplementation(
      async (callback) => callback(prisma),
    );

    prisma.$queryRaw
  .mockResolvedValueOnce([{ id: submission.staffId }])
  .mockResolvedValueOnce([{
    id: submission.id,
    status: 'REVIEWED',
  }]);
    prisma.dailySubmission.update.mockResolvedValue(
      approvedSubmission,
    );
    prisma.auditLog.create.mockResolvedValue({
      id: 'audit-a',
    });

    const result = await service.approve(submission.id, user);

    expect(result).toEqual(approvedSubmission);

    expect(prisma.dailySubmission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: submission.id },
        data: expect.objectContaining({
          status: 'APPROVED',
          approvedByUserId: user.id,
          approvedAt: expect.any(Date),
        }),
      }),
    );

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: user.id,
        action: 'APPROVE',
        module: 'SUBMISSIONS',
        entityType: 'DailySubmission',
        entityId: submission.id,
        oldValue: {
          status: 'REVIEWED',
        },
        newValue: expect.objectContaining({
          status: 'APPROVED',
          approvedByUserId: user.id,
          approvedAt: expect.any(String),
        }),
      }),
    });
  });

  it('uses the same transaction client for approval and audit', async () => {
    const user = makeUser([{
      ...otherBranchApprover,
      branchId: 'branch-a',
    }]);

  const transactionClient = {
  $queryRaw: vi.fn()
    .mockResolvedValueOnce([{ id: submission.staffId }])
    .mockResolvedValueOnce([{
      id: submission.id,
      status: 'REVIEWED',
    }]),
      dailySubmission: {
        update: vi.fn().mockResolvedValue({
          ...submission,
          status: 'APPROVED',
        }),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({
          id: 'audit-a',
        }),
      },
    };

    prisma.$transaction.mockImplementation(
      async (callback) => callback(transactionClient),
    );

    await service.approve(submission.id, user);

    expect(
      transactionClient.dailySubmission.update,
    ).toHaveBeenCalledTimes(1);

    expect(
      transactionClient.auditLog.create,
    ).toHaveBeenCalledTimes(1);

    expect(
      prisma.dailySubmission.update,
    ).not.toHaveBeenCalled();

    expect(
      prisma.auditLog.create,
    ).not.toHaveBeenCalled();
  });

  it('propagates audit failure so the approval transaction rejects', async () => {
    const user = makeUser([{
      ...otherBranchApprover,
      branchId: 'branch-a',
    }]);

    const auditFailure = new Error('Audit write failed');

    prisma.$transaction.mockImplementation(
      async (callback) => callback(prisma),
    );

    prisma.$queryRaw
  .mockResolvedValueOnce([{ id: submission.staffId }])
  .mockResolvedValueOnce([{
    id: submission.id,
    status: 'REVIEWED',
  }]);

    prisma.dailySubmission.update.mockResolvedValue({
      ...submission,
      status: 'APPROVED',
    });

    prisma.auditLog.create.mockRejectedValue(
      auditFailure,
    );

    await expect(
      service.approve(submission.id, user),
    ).rejects.toThrow('Audit write failed');

    expect(
      prisma.dailySubmission.update,
    ).toHaveBeenCalledTimes(1);

    expect(
      prisma.auditLog.create,
    ).toHaveBeenCalledTimes(1);
  });



  // ==========================================================
  // DISTRICT AND REGIONAL APPROVAL JUSTIFICATION TESTS
  // ==========================================================

  const districtApprover: AuthenticatedUserRoleAssignment = {
    roleCode: 'DISTRICT_MANAGER',
    scopeType: 'DISTRICT',
    regionId: null,
    districtId: 'district-a',
    branchId: null,
    permissions: ['submission.approve'],
  };

  const regionalApprover: AuthenticatedUserRoleAssignment = {
    roleCode: 'REGIONAL_MANAGER',
    scopeType: 'REGION',
    regionId: 'region-a',
    districtId: null,
    branchId: null,
    permissions: ['submission.approve'],
  };

  function mockSuccessfulApproval() {
    prisma.$transaction.mockImplementation(
      async (callback) => callback(prisma),
    );

    prisma.$queryRaw
      .mockResolvedValueOnce([{ id: submission.staffId }])
      .mockResolvedValueOnce([{
        id: submission.id,
        status: 'REVIEWED',
      }]);

    prisma.dailySubmission.update.mockResolvedValue({
      ...submission,
      status: 'APPROVED',
    });

    prisma.auditLog.create.mockResolvedValue({
      id: 'audit-justification',
    });
  }

  it('requires a justification for district manager approval', async () => {
    const user = makeUser([districtApprover]);

    await expect(
      service.approve(submission.id, user),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('rejects whitespace-only district approval justification', async () => {
    const user = makeUser([districtApprover]);

    await expect(
      service.approve(submission.id, user, '   '),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('requires a justification for regional manager approval', async () => {
    const user = makeUser([regionalApprover]);

    await expect(
      service.approve(submission.id, user),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('records district approval justification in the audit log', async () => {
    const user = makeUser([districtApprover]);

    mockSuccessfulApproval();

    await service.approve(
      submission.id,
      user,
      '  Branch manager unavailable; district review completed  ',
    );

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'APPROVE',
        userId: user.id,
        entityId: submission.id,
        newValue: expect.objectContaining({
          approvalAuthority: 'DISTRICT_MANAGER',
          justification:
            'Branch manager unavailable; district review completed',
        }),
      }),
    });
  });

  it('records regional approval justification in the audit log', async () => {
    const user = makeUser([regionalApprover]);

    mockSuccessfulApproval();

    await service.approve(
      submission.id,
      user,
      'Regional escalation following management review',
    );

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'APPROVE',
        userId: user.id,
        entityId: submission.id,
        newValue: expect.objectContaining({
          approvalAuthority: 'REGIONAL_MANAGER',
          justification:
            'Regional escalation following management review',
        }),
      }),
    });
  });

  it('uses valid branch authority for a mixed branch and district manager', async () => {
    const user = makeUser([
      districtApprover,
      {
        ...otherBranchApprover,
        branchId: 'branch-a',
      },
    ]);

    mockSuccessfulApproval();

    await service.approve(submission.id, user);

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        newValue: expect.objectContaining({
          approvalAuthority: 'BRANCH_MANAGER',
          justification: null,
        }),
      }),
    });
  });


});
