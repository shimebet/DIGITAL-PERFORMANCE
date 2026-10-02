import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  PrismaService,
} from '../../database/prisma/prisma.service.js';

import type {
  AuthenticatedUser,
} from '../auth/interfaces/authenticated-user.interface.js';

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly prisma:
      PrismaService,
  ) {}

  async createDraft(
    submissionDate: string,
    remarks: string | undefined,
    user: AuthenticatedUser,
  ) {
    const staff =
      await this.prisma.staffProfile.findUnique({
        where: {
          userId:
            user.id,
        },
      });

    if (!staff) {
      throw new BadRequestException(
        'User does not have a staff profile',
      );
    }

    const date =
      new Date(
        submissionDate,
      );

    const existing =
      await this.prisma.dailySubmission.findFirst({
        where: {
          staffId:
            user.id,

          branchId:
            staff.branchId,

          submissionDate:
            date,
        },
      });

    if (existing) {
      return existing;
    }

    return this.prisma.dailySubmission.create({
      data: {
        staffId:
          user.id,

        branchId:
          staff.branchId,

        submissionDate:
          date,

        remarks:
          remarks?.trim(),

        status:
          'DRAFT',
      },
    });
  }

  async mine(
    user: AuthenticatedUser,
  ) {
    return this.prisma.dailySubmission.findMany({
      where: {
        staffId:
          user.id,
      },

      include: {
        branch:
          true,

        activities: {
          include: {
            products: {
              include: {
                product:
                  true,
              },
            },
          },
        },
      },

      orderBy: {
        submissionDate:
          'desc',
      },
    });
  }

  async findOne(
    id: string,
    user: AuthenticatedUser,
  ) {
    const submission =
      await this.prisma.dailySubmission.findUnique({
        where: {
          id,
        },

        include: {
          branch: {
            include: {
              district: {
                include: {
                  region:
                    true,
                },
              },
            },
          },

          activities: {
            include: {
              products: {
                include: {
                  product:
                    true,
                },
              },
            },
          },

          staff: {
            select: {
              id:
                true,

              username:
                true,

              firstName:
                true,

              lastName:
                true,
            },
          },
        },
      });

    if (!submission) {
      throw new NotFoundException(
        'Submission not found',
      );
    }

    if (
      submission.staffId ===
        user.id ||
      user.roles.includes(
        'SUPER_ADMIN',
      )
    ) {
      return submission;
    }

    const branchAllowed =
      user.scopes.some(
        (scope) =>
          scope.scopeType ===
            'BRANCH' &&
          scope.branchId ===
            submission.branchId,
      );

    const districtAllowed =
      user.scopes.some(
        (scope) =>
          scope.scopeType ===
            'DISTRICT' &&
          scope.districtId ===
            submission.branch.districtId,
      );

    const regionAllowed =
      user.scopes.some(
        (scope) =>
          scope.scopeType ===
            'REGION' &&
          scope.regionId ===
            submission.branch.district.regionId,
      );

    const global =
      user.scopes.some(
        (scope) =>
          scope.scopeType ===
            'GLOBAL',
      );

    if (
      !branchAllowed &&
      !districtAllowed &&
      !regionAllowed &&
      !global
    ) {
      throw new ForbiddenException(
        'You do not have access to this submission',
      );
    }

    return submission;
  }

  async submit(
    id: string,
    user: AuthenticatedUser,
  ) {
    const submission =
      await this.findOne(
        id,
        user,
      );

    if (
      submission.staffId !==
        user.id
    ) {
      throw new ForbiddenException(
        'Only the report owner can submit this record',
      );
    }

    if (
      submission.status !==
        'DRAFT' &&
      submission.status !==
        'RETURNED_FOR_CORRECTION'
    ) {
      throw new BadRequestException(
        'Submission cannot be submitted from its current status',
      );
    }

    if (
      submission.activities.length ===
      0
    ) {
      throw new BadRequestException(
        'At least one activity is required before submission',
      );
    }

    return this.prisma.dailySubmission.update({
      where: {
        id,
      },

      data: {
        status:
          submission.status ===
          'RETURNED_FOR_CORRECTION'
            ? 'RESUBMITTED'
            : 'SUBMITTED',

        submittedAt:
          new Date(),

        version: {
          increment:
            1,
        },
      },
    });
  }

  async review(
    id: string,
    user: AuthenticatedUser,
  ) {
    const submission =
      await this.findOne(
        id,
        user,
      );

    if (
      submission.status !==
        'SUBMITTED' &&
      submission.status !==
        'RESUBMITTED'
    ) {
      throw new BadRequestException(
        'Only submitted reports can be reviewed',
      );
    }

    return this.prisma.dailySubmission.update({
      where: {
        id,
      },

      data: {
        status:
          'REVIEWED',

        reviewedAt:
          new Date(),
      },
    });
  }

  async approve(
    id: string,
    user: AuthenticatedUser,
  ) {
    const submission =
      await this.findOne(
        id,
        user,
      );

    if (
      submission.status !==
        'REVIEWED'
    ) {
      throw new BadRequestException(
        'Submission must be reviewed before approval',
      );
    }

    return this.prisma.dailySubmission.update({
      where: {
        id,
      },

      data: {
        status:
          'APPROVED',

        approvedAt:
          new Date(),

        approvedByUserId:
          user.id,
      },
    });
  }

  async returnForCorrection(
    id: string,
    reason: string,
    user: AuthenticatedUser,
  ) {
    const submission =
      await this.findOne(
        id,
        user,
      );

    if (
      ![
        'SUBMITTED',
        'RESUBMITTED',
        'REVIEWED',
      ].includes(
        submission.status,
      )
    ) {
      throw new BadRequestException(
        'Submission cannot be returned from its current status',
      );
    }

    return this.prisma.dailySubmission.update({
      where: {
        id,
      },

      data: {
        status:
          'RETURNED_FOR_CORRECTION',

        returnReason:
          reason.trim(),
      },
    });
  }
}