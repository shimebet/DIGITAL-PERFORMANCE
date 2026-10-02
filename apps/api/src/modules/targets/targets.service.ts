import {
  BadRequestException,
  ConflictException,
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
  CreateTargetDto,
} from './dto/create-target.dto.js';

import {
  UpdateTargetDto,
} from './dto/update-target.dto.js';

import {
  AssignTargetDto,
} from './dto/assign-target.dto.js';

@Injectable()
export class TargetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
  ) {}

  // ==========================================================================
  // CREATE TARGET
  // ==========================================================================

  async create(
    dto: CreateTargetDto,
    user: AuthenticatedUser,
  ) {
    const startDate =
      new Date(dto.startDate);

    const endDate =
      new Date(dto.endDate);

    if (endDate < startDate) {
      throw new BadRequestException(
        'endDate must be greater than or equal to startDate',
      );
    }

    return this.prisma.target.create({
      data: {
        name:
          dto.name.trim(),

        description:
          dto.description?.trim(),

        metricType:
          dto.metricType,

        periodType:
          dto.periodType,

        startDate,

        endDate,

        defaultTargetValue:
          dto.defaultTargetValue,

        createdByUserId:
          user.id,
      },
    });
  }

  // ==========================================================================
  // FIND ALL TARGETS
  // ==========================================================================

  async findAll() {
    return this.prisma.target.findMany({
      where: {
        deletedAt:
          null,
      },

      include: {
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

        _count: {
          select: {
            assignments:
              true,
          },
        },
      },

      orderBy: [
        {
          startDate:
            'desc',
        },

        {
          name:
            'asc',
        },
      ],
    });
  }

  // ==========================================================================
  // FIND ONE TARGET
  // ==========================================================================

  async findOne(
    id: string,
  ) {
    const target =
      await this.prisma.target.findFirst({
        where: {
          id,

          deletedAt:
            null,
        },

        include: {
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

          assignments: {
            include: {
              region:
                true,

              district:
                true,

              branch:
                true,

              user: {
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

              product:
                true,
            },
          },
        },
      });

    if (!target) {
      throw new NotFoundException(
        'Target not found',
      );
    }

    return target;
  }

  // ==========================================================================
  // UPDATE TARGET
  // ==========================================================================

  async update(
    id: string,
    dto: UpdateTargetDto,
  ) {
    const target =
      await this.findOne(id);

    const startDate =
      dto.startDate
        ? new Date(dto.startDate)
        : target.startDate;

    const endDate =
      dto.endDate
        ? new Date(dto.endDate)
        : target.endDate;

    if (endDate < startDate) {
      throw new BadRequestException(
        'endDate must be greater than or equal to startDate',
      );
    }

    return this.prisma.target.update({
      where: {
        id,
      },

      data: {
        name:
          dto.name?.trim(),

        description:
          dto.description?.trim(),

        metricType:
          dto.metricType,

        periodType:
          dto.periodType,

        startDate:
          dto.startDate
            ? startDate
            : undefined,

        endDate:
          dto.endDate
            ? endDate
            : undefined,

        defaultTargetValue:
          dto.defaultTargetValue,

        status:
          dto.status,
      },
    });
  }

  // ==========================================================================
  // SOFT DELETE TARGET
  // ==========================================================================

  async remove(
    id: string,
  ) {
    await this.findOne(id);

    return this.prisma.target.update({
      where: {
        id,
      },

      data: {
        status:
          'INACTIVE',

        deletedAt:
          new Date(),
      },
    });
  }

  // ==========================================================================
  // ASSIGN TARGET
  // ==========================================================================

  async assign(
    dto: AssignTargetDto,
    currentUser: AuthenticatedUser,
  ) {
    const target =
      await this.prisma.target.findFirst({
        where: {
          id:
            dto.targetId,

          deletedAt:
            null,

          status:
            'ACTIVE',
        },
      });

    if (!target) {
      throw new NotFoundException(
        'Target not found',
      );
    }

    if (dto.productId) {
      const product =
        await this.prisma.product.findFirst({
          where: {
            id:
              dto.productId,

            deletedAt:
              null,

            status:
              'ACTIVE',
          },
        });

      if (!product) {
        throw new NotFoundException(
          'Product not found',
        );
      }
    }

    await this.validateAssignmentScope(
      dto,
      currentUser,
    );

    const duplicate =
      await this.prisma.targetAssignment.findFirst({
        where: {
          targetId:
            dto.targetId,

          scopeType:
            dto.scopeType,

          regionId:
            dto.regionId ?? null,

          districtId:
            dto.districtId ?? null,

          branchId:
            dto.branchId ?? null,

          userId:
            dto.userId ?? null,

          productId:
            dto.productId ?? null,
        },
      });

    if (duplicate) {
      throw new ConflictException(
        'Target already assigned to this scope and product',
      );
    }

    return this.prisma.targetAssignment.create({
      data: {
        targetId:
          dto.targetId,

        scopeType:
          dto.scopeType,

        regionId:
          dto.regionId,

        districtId:
          dto.districtId,

        branchId:
          dto.branchId,

        userId:
          dto.userId,

        productId:
          dto.productId,

        targetValue:
          dto.targetValue,
      },

      include: {
        target:
          true,

        region:
          true,

        district:
          true,

        branch:
          true,

        product:
          true,

        user: {
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
  }

  // ==========================================================================
  // VALIDATE TARGET SCOPE
  // ==========================================================================

  private async validateAssignmentScope(
    dto: AssignTargetDto,
    currentUser: AuthenticatedUser,
  ) {
    switch (dto.scopeType) {
      case 'GLOBAL': {
        if (
          dto.regionId ||
          dto.districtId ||
          dto.branchId ||
          dto.userId
        ) {
          throw new BadRequestException(
            'GLOBAL target must not contain regionId, districtId, branchId or userId',
          );
        }

        if (
          !this.scopeService.isGlobal(
            currentUser,
          )
        ) {
          throw new BadRequestException(
            'Only global users can assign GLOBAL targets',
          );
        }

        break;
      }

      case 'REGION': {
        if (!dto.regionId) {
          throw new BadRequestException(
            'regionId is required for REGION target',
          );
        }

        if (
          dto.districtId ||
          dto.branchId ||
          dto.userId
        ) {
          throw new BadRequestException(
            'REGION target must not contain districtId, branchId or userId',
          );
        }

        await this.scopeService.assertRegionAccess(
          currentUser,
          dto.regionId,
        );

        break;
      }

      case 'DISTRICT': {
        if (!dto.districtId) {
          throw new BadRequestException(
            'districtId is required for DISTRICT target',
          );
        }

        if (
          dto.branchId ||
          dto.userId
        ) {
          throw new BadRequestException(
            'DISTRICT target must not contain branchId or userId',
          );
        }

        await this.scopeService.assertDistrictAccess(
          currentUser,
          dto.districtId,
        );

        const district =
          await this.prisma.district.findFirst({
            where: {
              id:
                dto.districtId,

              deletedAt:
                null,
            },
          });

        if (!district) {
          throw new NotFoundException(
            'District not found',
          );
        }

        dto.regionId =
          district.regionId;

        break;
      }

      case 'BRANCH': {
        if (!dto.branchId) {
          throw new BadRequestException(
            'branchId is required for BRANCH target',
          );
        }

        if (dto.userId) {
          throw new BadRequestException(
            'BRANCH target must not contain userId',
          );
        }

        await this.scopeService.assertBranchAccess(
          currentUser,
          dto.branchId,
        );

        const branch =
          await this.prisma.branch.findFirst({
            where: {
              id:
                dto.branchId,

              deletedAt:
                null,
            },

            include: {
              district:
                true,
            },
          });

        if (!branch) {
          throw new NotFoundException(
            'Branch not found',
          );
        }

        dto.districtId =
          branch.districtId;

        dto.regionId =
          branch.district.regionId;

        break;
      }

      case 'STAFF': {
        if (!dto.userId) {
          throw new BadRequestException(
            'userId is required for STAFF target',
          );
        }

        const user =
          await this.prisma.user.findFirst({
            where: {
              id:
                dto.userId,

              deletedAt:
                null,

              status:
                'ACTIVE',
            },

            include: {
              staffProfile: {
                include: {
                  branch: {
                    include: {
                      district:
                        true,
                    },
                  },
                },
              },
            },
          });

        if (!user) {
          throw new NotFoundException(
            'User not found',
          );
        }

        if (!user.staffProfile) {
          throw new BadRequestException(
            'Selected user is not assigned to a branch staff profile',
          );
        }

        await this.scopeService.assertBranchAccess(
          currentUser,
          user.staffProfile.branchId,
        );

        dto.branchId =
          user.staffProfile.branchId;

        dto.districtId =
          user.staffProfile.branch.districtId;

        dto.regionId =
          user.staffProfile.branch.district.regionId;

        break;
      }

      default:
        throw new BadRequestException(
          'Invalid target scope',
        );
    }
  }

  // ==========================================================================
  // GET ASSIGNMENTS
  // ==========================================================================

  async findAssignments(
    targetId: string,
  ) {
    await this.findOne(
      targetId,
    );

    return this.prisma.targetAssignment.findMany({
      where: {
        targetId,
      },

      include: {
        region:
          true,

        district:
          true,

        branch:
          true,

        product:
          true,

        user: {
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
    });
  }

  // ==========================================================================
  // REMOVE ASSIGNMENT
  // ==========================================================================

  async removeAssignment(
    id: string,
  ) {
    const assignment =
      await this.prisma.targetAssignment.findUnique({
        where: {
          id,
        },
      });

    if (!assignment) {
      throw new NotFoundException(
        'Target assignment not found',
      );
    }

    await this.prisma.targetAssignment.delete({
      where: {
        id,
      },
    });

    return {
      success:
        true,

      message:
        'Target assignment removed successfully',
    };
  }
}