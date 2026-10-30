import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';

import { SubmissionsService } from './submissions.service.js';

import type { PrismaService } from '../../database/prisma/prisma.service.js';
import type {
  AuthenticatedUser,
  AuthenticatedUserRoleAssignment,
} from '../auth/interfaces/authenticated-user.interface.js';

describe('SubmissionsService - analyst read access', () => {
  const prisma = {
    dailySubmission: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  };

  let service: SubmissionsService;

  function makeAnalyst(
    roleCode: 'DISTRICT_ANALYST' | 'REGIONAL_ANALYST',
    scopeId: string,
  ): AuthenticatedUser {
    const isDistrict = roleCode === 'DISTRICT_ANALYST';

    const assignment: AuthenticatedUserRoleAssignment = {
      roleCode,
      scopeType: isDistrict ? 'DISTRICT' : 'REGION',
      regionId: isDistrict ? null : scopeId,
      districtId: isDistrict ? scopeId : null,
      branchId: null,
      permissions: ['submission.read'],
    };

    return {
      id: 'analyst-1',
      username: 'analyst-1',
      firstName: 'Test',
      lastName: 'Analyst',
      mustChangePassword: false,
      roles: [roleCode],
      permissions: ['submission.read'],
      scopes: [{
        scopeType: assignment.scopeType,
        regionId: assignment.regionId,
        districtId: assignment.districtId,
        branchId: assignment.branchId,
      }],
      roleAssignments: [assignment],
    };
  }

  function makeSubmission(
    status: string,
    districtId = 'district-a',
    regionId = 'region-a',
  ) {
    return {
      id: `submission-${status}`,
      staffId: 'staff-1',
      branchId: 'branch-a',
      status,
      branch: {
        districtId,
        district: {
          regionId,
        },
      },
    };
  }

  beforeEach(() => {
    vi.resetAllMocks();

    service = new SubmissionsService(
      prisma as unknown as PrismaService,
    );
  });

  it('restricts district analyst listing to assigned district', async () => {
    const user = makeAnalyst('DISTRICT_ANALYST', 'district-a');

    prisma.dailySubmission.findMany.mockResolvedValue([]);

    await service.findAll({}, user);

    const args = prisma.dailySubmission.findMany.mock.calls[0][0];

    expect(args.where).toEqual(
      expect.objectContaining({
        AND: expect.arrayContaining([
          expect.objectContaining({
            OR: expect.arrayContaining([
              {
                branch: {
                  districtId: {
                    in: ['district-a'],
                  },
                },
              },
            ]),
          }),
        ]),
      }),
    );
  });

  it('restricts regional analyst listing to assigned region', async () => {
    const user = makeAnalyst('REGIONAL_ANALYST', 'region-a');

    prisma.dailySubmission.findMany.mockResolvedValue([]);

    await service.findAll({}, user);

    const args = prisma.dailySubmission.findMany.mock.calls[0][0];

    expect(args.where).toEqual(
      expect.objectContaining({
        AND: expect.arrayContaining([
          expect.objectContaining({
            OR: expect.arrayContaining([
              {
                branch: {
                  district: {
                    regionId: {
                      in: ['region-a'],
                    },
                  },
                },
              },
            ]),
          }),
        ]),
      }),
    );
  });

  it('does not let a request filter replace district scope', async () => {
    const user = makeAnalyst('DISTRICT_ANALYST', 'district-a');

    prisma.dailySubmission.findMany.mockResolvedValue([]);

    await service.findAll(
      { districtId: 'district-b' },
      user,
    );

    const args = prisma.dailySubmission.findMany.mock.calls[0][0];

    expect(args.where.AND).toEqual(
      expect.arrayContaining([
        {
          OR: [{
            branch: {
              districtId: {
                in: ['district-a'],
              },
            },
          }],
        },
        {
          branch: {
            districtId: 'district-b',
          },
        },
      ]),
    );
  });

  it('does not implicitly filter listings to APPROVED status', async () => {
    const user = makeAnalyst('REGIONAL_ANALYST', 'region-a');

    const statuses = [
      'DRAFT',
      'SUBMITTED',
      'REVIEWED',
      'APPROVED',
      'RETURNED',
    ];

    const submissions = statuses.map((status) =>
      makeSubmission(status),
    );

    prisma.dailySubmission.findMany.mockResolvedValue(submissions);

    const result = await service.findAll({}, user);

    expect(result).toEqual(submissions);

    const args = prisma.dailySubmission.findMany.mock.calls[0][0];

    expect(JSON.stringify(args.where)).not.toContain('"status"');
  });

  it('allows district analyst to read an in-scope draft', async () => {
    const user = makeAnalyst('DISTRICT_ANALYST', 'district-a');
    const submission = makeSubmission('DRAFT');

    prisma.dailySubmission.findUnique.mockResolvedValue(submission);

    await expect(
      service.findOne(submission.id, user),
    ).resolves.toEqual(submission);
  });

  it('allows regional analyst to read an in-scope approved submission', async () => {
    const user = makeAnalyst('REGIONAL_ANALYST', 'region-a');
    const submission = makeSubmission('APPROVED');

    prisma.dailySubmission.findUnique.mockResolvedValue(submission);

    await expect(
      service.findOne(submission.id, user),
    ).resolves.toEqual(submission);
  });

  it('denies district analyst access to another district', async () => {
    const user = makeAnalyst('DISTRICT_ANALYST', 'district-a');

    const submission = makeSubmission(
      'DRAFT',
      'district-b',
      'region-a',
    );

    prisma.dailySubmission.findUnique.mockResolvedValue(submission);

    await expect(
      service.findOne(submission.id, user),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('denies regional analyst access to another region', async () => {
    const user = makeAnalyst('REGIONAL_ANALYST', 'region-a');

    const submission = makeSubmission(
      'APPROVED',
      'district-b',
      'region-b',
    );

    prisma.dailySubmission.findUnique.mockResolvedValue(submission);

    await expect(
      service.findOne(submission.id, user),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
