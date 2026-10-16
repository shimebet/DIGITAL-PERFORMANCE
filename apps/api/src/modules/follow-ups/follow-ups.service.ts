import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  PrismaService,
} from '../../database/prisma/prisma.service.js';

import {
  ScopeService,
} from '../auth/services/scope.service.js';

import type {
  AuthenticatedUser,
} from '../auth/interfaces/authenticated-user.interface.js';

import {
  CreateFollowUpDto,
} from './dto/create-follow-up.dto.js';

import {
  UpdateFollowUpDto,
} from './dto/update-follow-up.dto.js';

import {
  UpdateFollowUpStatusDto,
} from './dto/update-follow-up-status.dto.js';

@Injectable()
export class FollowUpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
  ) {}

  // ==========================================================================
  // CREATE
  // ==========================================================================

  async create(
    dto: CreateFollowUpDto,
    currentUser: AuthenticatedUser,
  ) {
    const assignedUser =
      await this.prisma.user.findFirst({
        where: {
          id: dto.assignedToUserId,
          deletedAt: null,
          status: 'ACTIVE',
        },

        include: {
          staffProfile: {
            include: {
              branch: {
                include: {
                  district: true,
                },
              },
            },
          },
        },
      });

    if (!assignedUser) {
      throw new NotFoundException(
        'Assigned user not found',
      );
    }

    if (!assignedUser.staffProfile) {
      throw new BadRequestException(
        'Assigned user does not have a staff profile',
      );
    }

    await this.scopeService.assertBranchAccess(
      currentUser,
      assignedUser.staffProfile.branchId,
    );

    if (dto.productId) {
      const product =
        await this.prisma.product.findFirst({
          where: {
            id: dto.productId,
            status: 'ACTIVE',
            deletedAt: null,
          },
        });

      if (!product) {
        throw new NotFoundException(
          'Product not found',
        );
      }
    }

    if (dto.activityId) {
      const activity =
        await this.prisma.activity.findUnique({
          where: {
            id: dto.activityId,
          },
        });

      if (!activity) {
        throw new NotFoundException(
          'Activity not found',
        );
      }

      await this.scopeService.assertBranchAccess(
        currentUser,
        activity.branchId,
      );
    }

    const followUp =
      await this.prisma.followUp.create({
        data: {
          activityId: dto.activityId,

          branchId:
            assignedUser.staffProfile.branchId,

          productId:
            dto.productId,

          createdByUserId:
            currentUser.id,

          assignedToUserId:
            dto.assignedToUserId,

          customerReference:
            dto.customerReference?.trim(),

          customerNameMasked:
            dto.customerNameMasked?.trim(),

          contactReference:
            dto.contactReference?.trim(),

          reason:
            dto.reason?.trim(),

          priority:
            dto.priority,

          followUpDate:
            new Date(dto.followUpDate),

          remarks:
            dto.remarks?.trim(),

          status:
            'OPEN',
        },

        include: {
          branch: {
            include: {
              district: {
                include: {
                  region: true,
                },
              },
            },
          },

          product: true,

          createdBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },

          assignedTo: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

    await this.prisma.followUpHistory.create({
      data: {
        followUpId:
          followUp.id,

        changedByUserId:
          currentUser.id,

        previousStatus:
          null,

        newStatus:
          'OPEN',

        note:
          'Follow-up created',
      },
    });

    return followUp;
  }

  // ==========================================================================
  // FIND MY ASSIGNED FOLLOW-UPS
  // ==========================================================================

  async findMine(
    user: AuthenticatedUser,
  ) {
    return this.prisma.followUp.findMany({
      where: {
        assignedToUserId:
          user.id,
      },

      include: {
        product:
          true,

        branch:
          true,

        createdBy: {
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

      orderBy: [
        {
          followUpDate:
            'asc',
        },

        {
          priority:
            'desc',
        },
      ],
    });
  }

  // ==========================================================================
  // FIND OVERDUE FOR CURRENT USER
  // ==========================================================================

  async findMyOverdue(
    user: AuthenticatedUser,
  ) {
// Today's Ethiopia-local calendar date, represented
// as UTC midnight for comparison with MySQL DATE columns.
const now = new Date();

const ethiopiaToday = new Date(
  now.getTime() + 3 * 60 * 60 * 1000,
)
  .toISOString()
  .slice(0, 10);

const today = new Date(`${ethiopiaToday}T00:00:00.000Z`);

    return this.prisma.followUp.findMany({
      where: {
        assignedToUserId:
          user.id,

        followUpDate: {
          lt: today,
        },

        status: {
          in: [
            'OPEN',
            'CONTACTED',
            'RESCHEDULED',
          ],
        },
      },

      include: {
        product:
          true,

        branch:
          true,
      },

      orderBy: {
        followUpDate:
          'asc',
      },
    });
  }

  // ==========================================================================
  // FIND ALL SCOPED
  // ==========================================================================

  async findAllScoped(
    user: AuthenticatedUser,
  ) {
    if (
      this.scopeService.isGlobal(
        user,
      )
    ) {
      return this.prisma.followUp.findMany({
        include: {
          product:
            true,

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

          assignedTo: {
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

        orderBy: {
          followUpDate:
            'desc',
        },
      });
    }

    const regionIds =
      this.scopeService.getRegionIds(
        user,
      );

    const districtIds =
      this.scopeService.getDistrictIds(
        user,
      );

    const branchIds =
      this.scopeService.getBranchIds(
        user,
      );

    return this.prisma.followUp.findMany({
      where: {
        OR: [
          {
            assignedToUserId:
              user.id,
          },

          ...(branchIds.length
            ? [
                {
                  branchId: {
                    in:
                      branchIds,
                  },
                },
              ]
            : []),

          ...(districtIds.length
            ? [
                {
                  branch: {
                    districtId: {
                      in:
                        districtIds,
                    },
                  },
                },
              ]
            : []),

          ...(regionIds.length
            ? [
                {
                  branch: {
                    district: {
                      regionId: {
                        in:
                          regionIds,
                      },
                    },
                  },
                },
              ]
            : []),
        ],
      },

      include: {
        product:
          true,

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

        assignedTo: {
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

      orderBy: {
        followUpDate:
          'desc',
      },
    });
  }

  // ==========================================================================
  // FIND ONE
  // ==========================================================================

  async findOne(
    id: string,
    user: AuthenticatedUser,
  ) {
    const followUp =
      await this.prisma.followUp.findUnique({
        where: {
          id,
        },

        include: {
          product:
            true,

          activity:
            true,

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

          createdBy: {
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

          assignedTo: {
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

          history: {
            include: {
              changedBy: {
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

            orderBy: {
              createdAt:
                'desc',
            },
          },
        },
      });

    if (!followUp) {
      throw new NotFoundException(
        'Follow-up not found',
      );
    }

    if (
      followUp.assignedToUserId ===
        user.id ||
      followUp.createdByUserId ===
        user.id ||
      this.scopeService.isGlobal(
        user,
      )
    ) {
      return followUp;
    }

    await this.scopeService.assertBranchAccess(
      user,
      followUp.branchId,
    );

    return followUp;
  }

  // ==========================================================================
  // UPDATE
  // ==========================================================================

  async update(
    id: string,
    dto: UpdateFollowUpDto,
    user: AuthenticatedUser,
  ) {
    const existing =
      await this.findOne(
        id,
        user,
      );

    if (dto.assignedToUserId) {
      const assignedUser =
        await this.prisma.user.findFirst({
          where: {
            id:
              dto.assignedToUserId,

            deletedAt:
              null,

            status:
              'ACTIVE',
          },

          include: {
            staffProfile:
              true,
          },
        });

      if (
        !assignedUser ||
        !assignedUser.staffProfile
      ) {
        throw new BadRequestException(
          'Assigned user is not an active branch staff member',
        );
      }

      await this.scopeService.assertBranchAccess(
        user,
        assignedUser.staffProfile.branchId,
      );
    }

    return this.prisma.followUp.update({
      where: {
        id,
      },

      data: {
        assignedToUserId:
          dto.assignedToUserId,

        productId:
          dto.productId,

        customerReference:
          dto.customerReference?.trim(),

        customerNameMasked:
          dto.customerNameMasked?.trim(),

        contactReference:
          dto.contactReference?.trim(),

        reason:
          dto.reason?.trim(),

        priority:
          dto.priority,

        followUpDate:
          dto.followUpDate
            ? new Date(
                dto.followUpDate,
              )
            : undefined,

        nextFollowUpDate:
          dto.nextFollowUpDate
            ? new Date(
                dto.nextFollowUpDate,
              )
            : undefined,

        remarks:
          dto.remarks?.trim(),

        outcome:
          dto.outcome?.trim(),
      },
    });
  }

  // ==========================================================================
  // UPDATE STATUS + HISTORY
  // ==========================================================================

  async updateStatus(
    id: string,
    dto: UpdateFollowUpStatusDto,
    user: AuthenticatedUser,
  ) {
    const followUp =
      await this.findOne(
        id,
        user,
      );

    if (
      followUp.assignedToUserId !==
        user.id &&
      !this.scopeService.isGlobal(
        user,
      )
    ) {
      await this.scopeService.assertBranchAccess(
        user,
        followUp.branchId,
      );
    }

    if (
      dto.status ===
        'RESCHEDULED' &&
      !dto.nextFollowUpDate
    ) {
      throw new BadRequestException(
        'nextFollowUpDate is required when status is RESCHEDULED',
      );
    }

    const completedStatuses = [
      'CONVERTED',
      'NOT_INTERESTED',
      'UNREACHABLE',
      'CLOSED',
    ];

    return this.prisma.$transaction(
      async (tx) => {
        const updated =
          await tx.followUp.update({
            where: {
              id,
            },

            data: {
              status:
                dto.status,

              outcome:
                dto.outcome?.trim(),

              nextFollowUpDate:
                dto.nextFollowUpDate
                  ? new Date(
                      dto.nextFollowUpDate,
                    )
                  : undefined,

              completedAt:
                completedStatuses.includes(
                  dto.status,
                )
                  ? new Date()
                  : null,
            },
          });

        await tx.followUpHistory.create({
          data: {
            followUpId:
              id,

            changedByUserId:
              user.id,

            previousStatus:
              followUp.status,

            newStatus:
              dto.status,

            note:
              dto.note?.trim(),
          },
        });

        return updated;
      },
    );
  }

  // ==========================================================================
  // SUMMARY
  // ==========================================================================

  async summary(
    user: AuthenticatedUser,
  ) {
    const all =
      await this.findAllScoped(
        user,
      );

// Today's Ethiopia-local calendar date, represented
// as UTC midnight for comparison with MySQL DATE columns.
const now = new Date();

const ethiopiaToday = new Date(
  now.getTime() + 3 * 60 * 60 * 1000,
)
  .toISOString()
  .slice(0, 10);

const today = new Date(`${ethiopiaToday}T00:00:00.000Z`);

    return {
      total:
        all.length,

      open:
        all.filter(
          (item) =>
            item.status ===
            'OPEN',
        ).length,

      contacted:
        all.filter(
          (item) =>
            item.status ===
            'CONTACTED',
        ).length,

      rescheduled:
        all.filter(
          (item) =>
            item.status ===
            'RESCHEDULED',
        ).length,

      converted:
        all.filter(
          (item) =>
            item.status ===
            'CONVERTED',
        ).length,

      overdue:
        all.filter(
          (item) =>
            item.followUpDate <
              today &&
            [
              'OPEN',
              'CONTACTED',
              'RESCHEDULED',
            ].includes(
              item.status,
            ),
        ).length,
    };
  }
}