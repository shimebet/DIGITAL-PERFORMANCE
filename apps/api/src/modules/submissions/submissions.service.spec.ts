
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SubmissionsService } from './submissions.service.js';
import { PrismaService } from '../../database/prisma/prisma.service.js';

import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';

describe('SubmissionsService - daily draft activity linking', () => {
  let service: SubmissionsService;

  const submissionDate = '2026-10-08';
  const date = new Date(submissionDate);

  const user = {
    id: 'staff-1',
    roles: ['DIGITAL_RESKILLED_STAFF'],
    scopes: [],
  } as unknown as AuthenticatedUser;

  const staffProfile = {
    userId: user.id,
    branchId: 'branch-1',
  };

  const prisma = {
    $queryRaw: vi.fn(),

    staffProfile: {
      findUnique: vi.fn(),
    },

    dailySubmission: {
      upsert: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },

    activity: {
      updateMany: vi.fn(),
    },

    $transaction: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();

    prisma.staffProfile.findUnique.mockResolvedValue(
      staffProfile,
    );

    // Simulate SELECT id FROM users ... FOR UPDATE.
    prisma.$queryRaw.mockResolvedValue([
      { id: user.id },
    ]);

    prisma.activity.updateMany.mockResolvedValue({
      count: 1,
    });

    // Execute the callback using the mocked transaction client.
    prisma.$transaction.mockImplementation(
      async (
        callback: (tx: typeof prisma) => Promise<unknown>,
      ) => callback(prisma),
    );

    service = new SubmissionsService(
      prisma as unknown as PrismaService,
    );
  });

  it('creates a draft and links existing activities', async () => {
    const submission = {
      id: 'submission-1',
      staffId: user.id,
      branchId: staffProfile.branchId,
      submissionDate: date,
      status: 'DRAFT',
    };

    prisma.dailySubmission.upsert.mockResolvedValue(
      submission,
    );

    prisma.dailySubmission.findUniqueOrThrow.mockResolvedValue({
      ...submission,
      activities: [{ id: 'activity-1' }],
    });

    const result = await service.createDraft(
      submissionDate,
      'Daily performance',
      user,
    );

    expect(prisma.$queryRaw).toHaveBeenCalledOnce();

    expect(prisma.dailySubmission.upsert).toHaveBeenCalledWith({
      where: {
        staffId_branchId_submissionDate: {
          staffId: user.id,
          branchId: staffProfile.branchId,
          submissionDate: date,
        },
      },
      create: {
        staffId: user.id,
        branchId: staffProfile.branchId,
        submissionDate: date,
        remarks: 'Daily performance',
        status: 'DRAFT',
      },
      update: {},
    });

    expect(prisma.activity.updateMany).toHaveBeenCalledWith({
      where: {
        staffId: user.id,
        branchId: staffProfile.branchId,
        activityDate: date,
        submissionId: null,
      },
      data: {
        submissionId: submission.id,
      },
    });

    // The staff lock must be acquired before the upsert.
    expect(
      prisma.$queryRaw.mock.invocationCallOrder[0],
    ).toBeLessThan(
      prisma.dailySubmission.upsert.mock.invocationCallOrder[0],
    );

    // The upsert must precede activity linking.
    expect(
      prisma.dailySubmission.upsert.mock.invocationCallOrder[0],
    ).toBeLessThan(
      prisma.activity.updateMany.mock.invocationCallOrder[0],
    );

    expect(result.activities).toHaveLength(1);
  });

  it('reuses an existing draft and links unlinked activities', async () => {
    const submission = {
      id: 'existing-draft',
      status: 'DRAFT',
    };

    prisma.dailySubmission.upsert.mockResolvedValue(
      submission,
    );

    prisma.dailySubmission.findUniqueOrThrow.mockResolvedValue({
      ...submission,
      activities: [{ id: 'activity-1' }],
    });

    await service.createDraft(
      submissionDate,
      undefined,
      user,
    );

    expect(prisma.$queryRaw).toHaveBeenCalledOnce();

    expect(prisma.activity.updateMany).toHaveBeenCalledOnce();

    expect(prisma.activity.updateMany).toHaveBeenCalledWith({
      where: {
        staffId: user.id,
        branchId: staffProfile.branchId,
        activityDate: date,
        submissionId: null,
      },
      data: {
        submissionId: 'existing-draft',
      },
    });
  });

  it('does not modify activities of an approved submission', async () => {
    const submission = {
      id: 'approved-submission',
      status: 'APPROVED',
    };

    prisma.dailySubmission.upsert.mockResolvedValue(
      submission,
    );

    prisma.dailySubmission.findUniqueOrThrow.mockResolvedValue({
      ...submission,
      activities: [{ id: 'approved-activity' }],
    });

    const result = await service.createDraft(
      submissionDate,
      undefined,
      user,
    );

    expect(prisma.$queryRaw).toHaveBeenCalledOnce();

    expect(prisma.activity.updateMany).not.toHaveBeenCalled();

    expect(result.status).toBe('APPROVED');
  });

  it.each([
    'SUBMITTED',
    'RESUBMITTED',
    'REVIEWED',
  ])(
    'does not link activities when submission is %s',
    async (status) => {
      prisma.dailySubmission.upsert.mockResolvedValue({
        id: 'locked-submission',
        status,
      });

      prisma.dailySubmission.findUniqueOrThrow.mockResolvedValue({
        id: 'locked-submission',
        status,
        activities: [],
      });

      await service.createDraft(
        submissionDate,
        undefined,
        user,
      );

      expect(prisma.$queryRaw).toHaveBeenCalledOnce();

      expect(prisma.activity.updateMany).not.toHaveBeenCalled();
    },
  );

  it('allows linking for returned-for-correction submissions', async () => {
    prisma.dailySubmission.upsert.mockResolvedValue({
      id: 'returned-submission',
      status: 'RETURNED_FOR_CORRECTION',
    });

    prisma.dailySubmission.findUniqueOrThrow.mockResolvedValue({
      id: 'returned-submission',
      status: 'RETURNED_FOR_CORRECTION',
      activities: [],
    });

    await service.createDraft(
      submissionDate,
      undefined,
      user,
    );

    expect(prisma.$queryRaw).toHaveBeenCalledOnce();

    expect(prisma.activity.updateMany).toHaveBeenCalledOnce();
  });
});
