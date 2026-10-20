import {

  BadRequestException,

  ForbiddenException,

  Injectable,

  NotFoundException,

} from '@nestjs/common';

import type { Prisma } from '../../generated/prisma/client.js';

import { PrismaService } from '../../database/prisma/prisma.service.js';

import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';

import { SubmissionQueryDto } from './dto/submission-query.dto.js';

import {

  lockSubmission,

} from '../../database/prisma/submission-lock.js';

import { lockStaffActivity } from '../../database/prisma/staff-activity-lock.js';

import {
  canManageSubmission,
  type SubmissionManagerPermission,
} from './utils/submission-authorization.js';
@Injectable()

export class SubmissionsService {

  constructor(private readonly prisma: PrismaService) {}

  // ==========================================================================

  // CREATE DAILY DRAFT

  // ==========================================================================

async createDraft(

  submissionDate: string,

  remarks: string | undefined,

  user: AuthenticatedUser,

) {

  const staff = await this.prisma.staffProfile.findUnique({

    where: {

      userId: user.id,

    },

  });

  if (!staff) {

    throw new BadRequestException(

      'User does not have a staff profile',

    );

  }

  const date = new Date(submissionDate);

  if (Number.isNaN(date.getTime())) {

    throw new BadRequestException(

      'Invalid submission date',

    );

  }

  return this.prisma.$transaction(async (tx) => {

    await lockStaffActivity(tx, user.id);

    const submission = await tx.dailySubmission.upsert({

      where: {

        staffId_branchId_submissionDate: {

          staffId: user.id,

          branchId: staff.branchId,

          submissionDate: date,

        },

      },

      create: {

        staffId: user.id,

        branchId: staff.branchId,

        submissionDate: date,

        remarks: remarks?.trim(),

        status: 'DRAFT',

      },

      update: {},

    });

    if (

      submission.status === 'DRAFT' ||

      submission.status === 'RETURNED_FOR_CORRECTION'

    ) {

      await tx.activity.updateMany({

        where: {

          staffId: user.id,

          branchId: staff.branchId,

          activityDate: date,

          submissionId: null,

        },

        data: {

          submissionId: submission.id,

        },

      });

    }

    return tx.dailySubmission.findUniqueOrThrow({

      where: {

        id: submission.id,

      },

      include: this.submissionInclude(),

    });

  });

}

  // ==========================================================================

  // SCOPED MANAGEMENT LIST

  //

  // GET /submissions

  //

  // SUPER_ADMIN / GLOBAL

  //   -> all submissions

  //

  // REGION

  //   -> submissions inside assigned region

  //

  // DISTRICT

  //   -> submissions inside assigned district

  //

  // BRANCH

  //   -> submissions inside assigned branch

  //

  // STAFF

  //   -> own submissions only

  // ==========================================================================

  async findAll(

    query: SubmissionQueryDto,

    user: AuthenticatedUser,

  ) {

    const andConditions: Prisma.DailySubmissionWhereInput[] = [];

    // ------------------------------------------------------------------------

    // SECURITY / ORGANIZATIONAL SCOPE

    // ------------------------------------------------------------------------

    const isSuperAdmin =

      user.roles.includes('SUPER_ADMIN');

    const hasGlobalScope =

      user.scopes.some(

        (scope) =>

          scope.scopeType === 'GLOBAL',

      );

    if (!isSuperAdmin && !hasGlobalScope) {

      const regionIds =

        user.scopes

          .filter(

            (scope) =>

              scope.scopeType === 'REGION' &&

              Boolean(scope.regionId),

          )

          .map(

            (scope) =>

              scope.regionId!,

          );

      const districtIds =

        user.scopes

          .filter(

            (scope) =>

              scope.scopeType === 'DISTRICT' &&

              Boolean(scope.districtId),

          )

          .map(

            (scope) =>

              scope.districtId!,

          );

      const branchIds =

        user.scopes

          .filter(

            (scope) =>

              scope.scopeType === 'BRANCH' &&

              Boolean(scope.branchId),

          )

          .map(

            (scope) =>

              scope.branchId!,

          );

      const hasStaffScope =

        user.scopes.some(

          (scope) =>

            scope.scopeType === 'STAFF',

        );

      const scopeConditions: Prisma.DailySubmissionWhereInput[] =

        [];

      if (regionIds.length > 0) {

        scopeConditions.push({

          branch: {

            district: {

              regionId: {

                in: regionIds,

              },

            },

          },

        });

      }

      if (districtIds.length > 0) {

        scopeConditions.push({

          branch: {

            districtId: {

              in: districtIds,

            },

          },

        });

      }

      if (branchIds.length > 0) {

        scopeConditions.push({

          branchId: {

            in: branchIds,

          },

        });

      }

      if (hasStaffScope) {

        scopeConditions.push({

          staffId: user.id,

        });

      }

      if (scopeConditions.length === 0) {

        throw new ForbiddenException(

          'User does not have a valid organizational scope',

        );

      }

      andConditions.push({

        OR: scopeConditions,

      });

    }

    // ------------------------------------------------------------------------

    // OPTIONAL REQUEST FILTERS

    // ------------------------------------------------------------------------

    if (query.regionId) {

      andConditions.push({

        branch: {

          district: {

            regionId: query.regionId,

          },

        },

      });

    }

    if (query.districtId) {

      andConditions.push({

        branch: {

          districtId: query.districtId,

        },

      });

    }

    if (query.branchId) {

      andConditions.push({

        branchId: query.branchId,

      });

    }

    if (query.staffId) {

      andConditions.push({

        staffId: query.staffId,

      });

    }

    if (query.status) {

      andConditions.push({

        status: query.status as never,

      });

    }

    // ------------------------------------------------------------------------

    // DATE RANGE

    // ------------------------------------------------------------------------

    if (query.startDate || query.endDate) {

      const dateFilter: {

        gte?: Date;

        lt?: Date;

      } = {};

      if (query.startDate) {

        dateFilter.gte =

          new Date(query.startDate);

      }

      // Use an exclusive next-day boundary.

      if (query.endDate) {

        const endExclusive =

          new Date(query.endDate);

        endExclusive.setUTCDate(

          endExclusive.getUTCDate() + 1,

        );

        dateFilter.lt =

          endExclusive;

      }

      andConditions.push({

        submissionDate: dateFilter,

      });

    }

    const where: Prisma.DailySubmissionWhereInput =

      andConditions.length > 0

        ? {

            AND: andConditions,

          }

        : {};

    return this.prisma.dailySubmission.findMany({

      where,

      // Include Branch -> District -> Region for the management table.

      include: this.submissionInclude(),

      orderBy: [

        {

          submissionDate: 'desc',

        },

        {

          createdAt: 'desc',

        },

      ],

    });

  }

  // ==========================================================================

  // CURRENT STAFF USER'S SUBMISSIONS

  // ==========================================================================

  async mine(

    user: AuthenticatedUser,

  ) {

    return this.prisma.dailySubmission.findMany({

      where: {

        staffId: user.id,

      },

      include: this.submissionInclude(),

      orderBy: {

        submissionDate: 'desc',

      },

    });

  }

  // ==========================================================================

  // FIND ONE WITH SCOPE AUTHORIZATION

  // ==========================================================================

  async findOne(

    id: string,

    user: AuthenticatedUser,

  ) {

    const submission =

      await this.prisma.dailySubmission.findUnique({

        where: {

          id,

        },

        include: this.submissionInclude(),

      });

    if (!submission) {

      throw new NotFoundException(

        'Submission not found',

      );

    }

    // ------------------------------------------------------------------------

    // OWNER

    // ------------------------------------------------------------------------

    if (

      submission.staffId ===

      user.id

    ) {

      return submission;

    }

    // ------------------------------------------------------------------------

    // SUPER ADMIN

    // ------------------------------------------------------------------------

    if (

      user.roles.includes(

        'SUPER_ADMIN',

      )

    ) {

      return submission;

    }

    // ------------------------------------------------------------------------

    // GLOBAL SCOPE

    // ------------------------------------------------------------------------

    const globalAllowed =

      user.scopes.some(

        (scope) =>

          scope.scopeType ===

          'GLOBAL',

      );

    if (globalAllowed) {

      return submission;

    }

    // ------------------------------------------------------------------------

    // BRANCH SCOPE

    // ------------------------------------------------------------------------

    const branchAllowed =

      user.scopes.some(

        (scope) =>

          scope.scopeType ===

            'BRANCH' &&

          scope.branchId ===

            submission.branchId,

      );

    // ------------------------------------------------------------------------

    // DISTRICT SCOPE

    // ------------------------------------------------------------------------

    const districtAllowed =

      user.scopes.some(

        (scope) =>

          scope.scopeType ===

            'DISTRICT' &&

          scope.districtId ===

            submission.branch.districtId,

      );

    // ------------------------------------------------------------------------

    // REGION SCOPE

    // ------------------------------------------------------------------------

    const regionAllowed =

      user.scopes.some(

        (scope) =>

          scope.scopeType ===

            'REGION' &&

          scope.regionId ===

            submission.branch.district.regionId,

      );

    if (

      !branchAllowed &&

      !districtAllowed &&

      !regionAllowed

    ) {

      throw new ForbiddenException(

        'You do not have access to this submission',

      );

    }

    return submission;

  }

  // ==========================================================================

  // SUBMIT / RESUBMIT

  // ==========================================================================

async submit(

  id: string,

  user: AuthenticatedUser,

) {

  // Verify access and ownership before opening the transaction.

  const submission = await this.findOne(id, user);

  if (submission.staffId !== user.id) {

    throw new ForbiddenException(

      'Only the report owner can submit this record',

    );

  }

  return this.prisma.$transaction(async (tx) => {

    await lockStaffActivity(tx, submission.staffId);

    // Lock the current submission row.

    const lockedSubmission = await lockSubmission(tx, id);

    // Check the latest status while holding the lock.

    if (

      lockedSubmission.status !== 'DRAFT' &&

      lockedSubmission.status !== 'RETURNED_FOR_CORRECTION'

    ) {

      throw new BadRequestException(

        'Submission cannot be submitted from its current status',

      );

    }

    // Check activities within the same transaction.

    const activityCount = await tx.activity.count({

      where: {

        submissionId: id,

      },

    });

    if (activityCount === 0) {

      throw new BadRequestException(

        'At least one activity is required before submission',

      );

    }

    return tx.dailySubmission.update({

      where: {

        id,

      },

      data: {

        status:

          lockedSubmission.status === 'RETURNED_FOR_CORRECTION'

            ? 'RESUBMITTED'

            : 'SUBMITTED',

        submittedAt: new Date(),

        // Clear previous review/approval state on resubmission.

        reviewedAt: null,

        approvedAt: null,

        approvedByUserId: null,

        version: {

          increment: 1,

        },

      },

      include: this.submissionInclude(),

    });

  });

}

  // ==========================================================================

  // REVIEW

  // ==========================================================================

async review(

  id: string,

  user: AuthenticatedUser,

) {

  const submission = await this.findOne(id, user);

  this.assertSubmissionManagerAccess(submission, user, 'submission.review');

  this.assertNotOwner(

    submission.staffId,

    user,

    'review',

  );

  return this.prisma.$transaction(async (tx) => {

    await lockStaffActivity(tx, submission.staffId);

    const lockedSubmission = await lockSubmission(tx, id);

    if (

      lockedSubmission.status !== 'SUBMITTED' &&

      lockedSubmission.status !== 'RESUBMITTED'

    ) {

      throw new BadRequestException(

        'Only submitted reports can be reviewed',

      );

    }

    return tx.dailySubmission.update({

      where: {

        id,

      },

      data: {

        status: 'REVIEWED',

        reviewedAt: new Date(),

        returnReason: null,

      },

      include: this.submissionInclude(),

    });

  });

}

  // ==========================================================================

  // APPROVE

  // ==========================================================================

async approve(

  id: string,

  user: AuthenticatedUser,

) {

  // Existing authorization and organizational scope check.

  const submission = await this.findOne(id, user);

  this.assertSubmissionManagerAccess(submission, user, 'submission.approve');

  this.assertNotOwner(

    submission.staffId,

    user,

    'approve',

  );

  return this.prisma.$transaction(async (tx) => {

    await lockStaffActivity(tx, submission.staffId);

    // Lock the submission row until this transaction completes.

    const lockedSubmission = await lockSubmission(tx, id);

    // Validate the current status, not the previously fetched status.

    if (lockedSubmission.status !== 'REVIEWED') {

      throw new BadRequestException(

        'Submission must be reviewed before approval',

      );

    }

    return tx.dailySubmission.update({

      where: {

        id,

      },

      data: {

        status: 'APPROVED',

        approvedAt: new Date(),

        approvedByUserId: user.id,

        returnReason: null,

      },

      include: this.submissionInclude(),

    });

  });

}

  // ==========================================================================

  // RETURN FOR CORRECTION

  // ==========================================================================

async returnForCorrection(

  id: string,

  reason: string,

  user: AuthenticatedUser,

) {

  // Verify access and reviewer permissions.

  const submission = await this.findOne(id, user);

  this.assertSubmissionManagerAccess(submission, user, 'submission.review');

  this.assertNotOwner(

    submission.staffId,

    user,

    'return',

  );

  const normalizedReason = reason.trim();

  if (normalizedReason.length === 0) {

    throw new BadRequestException(

      'Return reason is required',

    );

  }

  return this.prisma.$transaction(async (tx) => {

    await lockStaffActivity(tx, submission.staffId);

    // Lock the submission row before checking its status.

    const lockedSubmission = await lockSubmission(tx, id);

    if (

      ![

        'SUBMITTED',

        'RESUBMITTED',

        'REVIEWED',

      ].includes(lockedSubmission.status)

    ) {

      throw new BadRequestException(

        'Submission cannot be returned from its current status',

      );

    }

    return tx.dailySubmission.update({

      where: {

        id,

      },

      data: {

        status: 'RETURNED_FOR_CORRECTION',

        returnReason: normalizedReason,

        // Clear previous review and approval state.

        reviewedAt: null,

        approvedAt: null,

        approvedByUserId: null,

      },

      include: this.submissionInclude(),

    });

  });

}

  // ==========================================================================

  // COMMON SUBMISSION INCLUDE

  //

  // Keep every submission endpoint consistent.

  //

  // This prevents:

  // - Branch showing but District missing

  // - Different response shapes between list/detail endpoints

  // - Frontend conditional workarounds

  // ==========================================================================

  private submissionInclude() {

    return {

      branch: {

        include: {

          district: {

            include: {

              region: true,

            },

          },

        },

      },

      staff: {

        select: {

          id: true,

          username: true,

          firstName: true,

          lastName: true,

        },

      },

      activities: {

        include: {

          products: {

            include: {

              product: true,

            },

          },

        },

      },

    } satisfies Prisma.DailySubmissionInclude;

  }

  // ==========================================================================

  // PRIVATE HELPERS

  // ==========================================================================

  private assertSubmissionManagerAccess(
    submission: {
      branchId: string;
      branch: {
        districtId: string;
        district: {
          regionId: string;
        };
      };
    },
    user: AuthenticatedUser,
    permission: SubmissionManagerPermission,
  ): void {
    const allowed = canManageSubmission(user, permission, {
      branchId: submission.branchId,
      districtId: submission.branch.districtId,
      regionId: submission.branch.district.regionId,
    });

    if (!allowed) {
      throw new ForbiddenException(
        'You do not have permission to manage this submission in its organizational scope',
      );
    }
  }
  private assertNotOwner(

    submissionStaffId: string,

    user: AuthenticatedUser,

    action:

      | 'review'

      | 'approve'

      | 'return',

  ) {

    if (

      submissionStaffId !==

      user.id

    ) {

      return;

    }

    if (action === 'review') {

      throw new ForbiddenException(

        'Users cannot review their own submission',

      );

    }

    if (action === 'approve') {

      throw new ForbiddenException(

        'Users cannot approve their own submission',

      );

    }

    throw new ForbiddenException(

      'Users cannot return their own submission for correction',

    );

  }

}
