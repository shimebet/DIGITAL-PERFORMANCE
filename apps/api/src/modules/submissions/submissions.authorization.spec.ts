import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { ForbiddenException } from '@nestjs/common';

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
      submission as Awaited<ReturnType<SubmissionsService['findOne']>>,
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
  }

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
    const user = makeUser([{
      ...otherBranchApprover,
      branchId: 'branch-a',
    }], submission.staffId);

    await expectDeniedWithoutMutation(() =>
      service.approve(submission.id, user),
    );
  });
});