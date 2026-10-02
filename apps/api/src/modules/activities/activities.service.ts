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

import {
  CreateActivityDto,
} from './dto/create-activity.dto.js';

import {
  UpdateActivityDto,
} from './dto/update-activity.dto.js';

@Injectable()
export class ActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private async getStaffContext(
    user: AuthenticatedUser,
  ) {
    const staff =
      await this.prisma.user.findFirst({
        where: {
          id: user.id,
          deletedAt: null,
          status: 'ACTIVE',
        },

        include: {
          staffProfile: {
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
            },
          },
        },
      });

    if (!staff) {
      throw new NotFoundException(
        'User not found',
      );
    }

    if (!staff.staffProfile) {
      throw new BadRequestException(
        'User is not assigned to a branch staff profile',
      );
    }

    return staff;
  }

  private validateTotals(
    dto:
      | CreateActivityDto
      | UpdateActivityDto,
  ) {
    if (
      dto.customersEducated !== undefined &&
      dto.customersContacted !== undefined &&
      dto.customersEducated >
        dto.customersContacted
    ) {
      throw new BadRequestException(
        'Customers educated cannot exceed customers contacted',
      );
    }

    if (
      dto.activations !== undefined &&
      dto.customersEducated !== undefined &&
      dto.activations >
        dto.customersEducated
    ) {
      throw new BadRequestException(
        'Activations cannot exceed customers educated',
      );
    }

    if (
      dto.transactions !== undefined &&
      dto.activations !== undefined &&
      dto.transactions >
        dto.activations
    ) {
      throw new BadRequestException(
        'Transactions cannot exceed activations',
      );
    }
  }

  async create(
    dto: CreateActivityDto,
    user: AuthenticatedUser,
  ) {
    this.validateTotals(dto);

    const staff =
      await this.getStaffContext(
        user,
      );

    const activityDate =
      new Date(
        dto.activityDate,
      );

    const submission =
      await this.prisma.dailySubmission.findFirst({
        where: {
          staffId: user.id,
          branchId:
            staff.staffProfile!.branchId,
          submissionDate:
            activityDate,
        },
      });

    if (
      submission &&
      submission.status !==
        'DRAFT' &&
      submission.status !==
        'RETURNED_FOR_CORRECTION'
    ) {
      throw new ForbiddenException(
        'Activities cannot be modified after submission',
      );
    }

    const productIds =
      dto.products.map(
        (item) =>
          item.productId,
      );

    const products =
      await this.prisma.product.findMany({
        where: {
          id: {
            in:
              productIds,
          },
          status:
            'ACTIVE',
          deletedAt:
            null,
        },
      });

    if (
      products.length !==
      new Set(productIds).size
    ) {
      throw new BadRequestException(
        'One or more products are invalid or inactive',
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        const activity =
          await tx.activity.create({
            data: {
              staffId:
                user.id,

              branchId:
                staff.staffProfile!.branchId,

              activityDate,

              customerVisits:
                dto.customerVisits,

              phoneCalls:
                dto.phoneCalls,

              customersContacted:
                dto.customersContacted,

              customersEducated:
                dto.customersEducated,

              activations:
                dto.activations,

              reactivations:
                dto.reactivations,

              transactions:
                dto.transactions,

              remarks:
                dto.remarks?.trim(),

              challenges:
                dto.challenges?.trim(),

              submissionId:
                submission?.id,
            },
          });

        for (
          const product
          of dto.products
        ) {
          await tx.activityProduct.create({
            data: {
              activityId:
                activity.id,

              productId:
                product.productId,

              customersEngaged:
                product.customersEngaged,

              activations:
                product.activations,

              reactivations:
                product.reactivations,

              transactions:
                product.transactions,

              failedActivations:
                product.failedActivations ??
                0,

              remarks:
                product.remarks?.trim(),
            },
          });
        }

        return tx.activity.findUnique({
          where: {
            id:
              activity.id,
          },

          include: {
            products: {
              include: {
                product:
                  true,
              },
            },
          },
        });
      },
    );
  }

  async findMine(
    user: AuthenticatedUser,
  ) {
    return this.prisma.activity.findMany({
      where: {
        staffId:
          user.id,
      },

      include: {
        branch:
          true,

        products: {
          include: {
            product:
              true,
          },
        },
      },

      orderBy: {
        activityDate:
          'desc',
      },
    });
  }

  async findOne(
    id: string,
    user: AuthenticatedUser,
  ) {
    const activity =
      await this.prisma.activity.findUnique({
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

          products: {
            include: {
              product:
                true,
            },
          },

          submission:
            true,
        },
      });

    if (!activity) {
      throw new NotFoundException(
        'Activity not found',
      );
    }

    if (
      !user.roles.includes(
        'SUPER_ADMIN',
      ) &&
      activity.staffId !==
        user.id
    ) {
      const allowedBranch =
        user.scopes.some(
          (scope) =>
            scope.scopeType ===
              'BRANCH' &&
            scope.branchId ===
              activity.branchId,
        );

      const allowedDistrict =
        user.scopes.some(
          (scope) =>
            scope.scopeType ===
              'DISTRICT' &&
            scope.districtId ===
              activity.branch.districtId,
        );

      const allowedRegion =
        user.scopes.some(
          (scope) =>
            scope.scopeType ===
              'REGION' &&
            scope.regionId ===
              activity.branch.district.regionId,
        );

      const global =
        user.scopes.some(
          (scope) =>
            scope.scopeType ===
              'GLOBAL',
        );

      if (
        !allowedBranch &&
        !allowedDistrict &&
        !allowedRegion &&
        !global
      ) {
        throw new ForbiddenException(
          'You do not have access to this activity',
        );
      }
    }

    return activity;
  }

  async update(
    id: string,
    dto: UpdateActivityDto,
    user: AuthenticatedUser,
  ) {
    this.validateTotals(dto);

    const activity =
      await this.findOne(
        id,
        user,
      );

    if (
      activity.staffId !==
        user.id &&
      !user.roles.includes(
        'SUPER_ADMIN',
      )
    ) {
      throw new ForbiddenException(
        'Only the activity owner can edit this record',
      );
    }

    if (
      activity.submission &&
      activity.submission.status !==
        'DRAFT' &&
      activity.submission.status !==
        'RETURNED_FOR_CORRECTION'
    ) {
      throw new ForbiddenException(
        'Activity cannot be changed after submission',
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        await tx.activity.update({
          where: {
            id,
          },

          data: {
            customerVisits:
              dto.customerVisits,

            phoneCalls:
              dto.phoneCalls,

            customersContacted:
              dto.customersContacted,

            customersEducated:
              dto.customersEducated,

            activations:
              dto.activations,

            reactivations:
              dto.reactivations,

            transactions:
              dto.transactions,

            remarks:
              dto.remarks?.trim(),

            challenges:
              dto.challenges?.trim(),
          },
        });

        if (dto.products) {
          await tx.activityProduct.deleteMany({
            where: {
              activityId:
                id,
            },
          });

          for (
            const product
            of dto.products
          ) {
            await tx.activityProduct.create({
              data: {
                activityId:
                  id,

                productId:
                  product.productId,

                customersEngaged:
                  product.customersEngaged,

                activations:
                  product.activations,

                reactivations:
                  product.reactivations,

                transactions:
                  product.transactions,

                failedActivations:
                  product.failedActivations ??
                  0,

                remarks:
                  product.remarks?.trim(),
              },
            });
          }
        }

        return tx.activity.findUnique({
          where: {
            id,
          },

          include: {
            products: {
              include: {
                product:
                  true,
              },
            },
          },
        });
      },
    );
  }
}