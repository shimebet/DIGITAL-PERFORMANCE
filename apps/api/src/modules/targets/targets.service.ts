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
      new Date(
        dto.startDate,
      );

    const endDate =
      new Date(
        dto.endDate,
      );

    if (
      endDate <
      startDate
    ) {
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

  // ==========================================================================
// FIND ALL TARGETS
// ==========================================================================

async findAll(
  currentUser: AuthenticatedUser,
) {
  const targets = await this.prisma.target.findMany({
    where: {
      deletedAt: null,
    },

    include: {
      createdBy: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
        },
      },
    },

    orderBy: [
      {
        startDate: 'desc',
      },
      {
        name: 'asc',
      },
    ],
  });

  // Global users can see the true assignment count.
  if (this.scopeService.isGlobal(currentUser)) {
    const targetIds = targets.map((target) => target.id);

    const counts =
      targetIds.length > 0
        ? await this.prisma.targetAssignment.groupBy({
            by: ['targetId'],
            where: {
              targetId: {
                in: targetIds,
              },
            },
            _count: {
              _all: true,
            },
          })
        : [];

    const countByTargetId = new Map(
      counts.map((item) => [
        item.targetId,
        item._count._all,
      ]),
    );

    return targets.map((target) => ({
      ...target,
      _count: {
        assignments:
          countByTargetId.get(target.id) ?? 0,
      },
    }));
  }

  // For scoped users, use the same authorization rules already used by
  // findAssignments(). This prevents out-of-scope assignment counts from
  // leaking through the target list.
  const targetsWithScopedCounts = await Promise.all(
    targets.map(async (target) => {
      const visibleAssignments =
        await this.findAssignments(
          target.id,
          currentUser,
        );

      return {
        ...target,
        _count: {
          assignments:
            visibleAssignments.length,
        },
      };
    }),
  );

  return targetsWithScopedCounts;
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

    if (
      !target
    ) {
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
      await this.findOne(
        id,
      );

    const startDate =
      dto.startDate
        ? new Date(
            dto.startDate,
          )
        : target.startDate;

    const endDate =
      dto.endDate
        ? new Date(
            dto.endDate,
          )
        : target.endDate;

    if (
      endDate <
      startDate
    ) {
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
    await this.findOne(
      id,
    );

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
    // =========================================================================
    // ACTIVE TARGET CHECK
    // -------------------------------------------------------------------------

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

if (
      !target
    ) {
      throw new NotFoundException(
        'Target not found',
      );
    }

    // =========================================================================
    // PRODUCT VALIDATION
    // =========================================================================

    if (
      dto.productId
    ) {
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

      if (
        !product
      ) {
        throw new NotFoundException(
          'Product not found',
        );
      }
    }

    // =========================================================================
    // SCOPE VALIDATION
    // =========================================================================

    await this.validateAssignmentScope(
      dto,
      currentUser,
    );

    // =========================================================================
    // DUPLICATE ASSIGNMENT CHECK
    // =========================================================================

    const duplicate =
      await this.prisma.targetAssignment.findFirst({
        where: {
          targetId:
            dto.targetId,

          scopeType:
            dto.scopeType,

          regionId:
            dto.regionId ??
            null,

          districtId:
            dto.districtId ??
            null,

          branchId:
            dto.branchId ??
            null,

          userId:
            dto.userId ??
            null,

          productId:
            dto.productId ??
            null,
        },
      });

    if (
      duplicate
    ) {
      throw new ConflictException(
        'Target already assigned to this scope and product',
      );
    }
// =========================================================================
// OVERLAPPING TARGET ASSIGNMENT VALIDATION
// =========================================================================

const overlappingAssignment =
  await this.prisma.targetAssignment.findFirst({
    where: {
      scopeType: dto.scopeType,

      // Match the same organizational recipient.
      ...(dto.scopeType === 'REGION'
        ? { regionId: dto.regionId }
        : {}),

      ...(dto.scopeType === 'DISTRICT'
        ? { districtId: dto.districtId }
        : {}),

      ...(dto.scopeType === 'BRANCH'
        ? { branchId: dto.branchId }
        : {}),

      ...(dto.scopeType === 'STAFF'
        ? { userId: dto.userId }
        : {}),

      productId: dto.productId ?? null,

      target: {
        status: 'ACTIVE',

        deletedAt: null,

        metricType: target.metricType,

        startDate: {
          lte: target.endDate,
        },

        endDate: {
          gte: target.startDate,
        },
      },
    },

    include: {
      target: true,
    },
  });

if (overlappingAssignment) {
  throw new ConflictException(
    'An active target already exists for this scope, product, metric, and overlapping reporting period',
  );
}
    // =========================================================================
    // CREATE ASSIGNMENT
    // =========================================================================

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
  // VALIDATE TARGET ASSIGNMENT SCOPE
  // ==========================================================================

  private async validateAssignmentScope(
    dto: AssignTargetDto,
    currentUser: AuthenticatedUser,
  ) {
    switch (
      dto.scopeType
    ) {
      // ========================================================================
      // GLOBAL
      // ========================================================================

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

      // ========================================================================
      // REGION
      // ========================================================================

      case 'REGION': {
        if (
          !dto.regionId
        ) {
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

      // ========================================================================
      // DISTRICT
      // ========================================================================

      case 'DISTRICT': {
        if (
          !dto.districtId
        ) {
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

        if (
          !district
        ) {
          throw new NotFoundException(
            'District not found',
          );
        }

        dto.regionId =
          district.regionId;

        break;
      }

      // ========================================================================
      // BRANCH
      // ========================================================================

      case 'BRANCH': {
        if (
          !dto.branchId
        ) {
          throw new BadRequestException(
            'branchId is required for BRANCH target',
          );
        }

        if (
          dto.userId
        ) {
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

        if (
          !branch
        ) {
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

      // ========================================================================
      // STAFF
      // ========================================================================

      case 'STAFF': {
        if (
          !dto.userId
        ) {
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

        if (
          !user
        ) {
          throw new NotFoundException(
            'User not found',
          );
        }

        if (
          !user.staffProfile
        ) {
          throw new BadRequestException(
            'Selected user is not assigned to a branch staff profile',
          );
        }

        await this.scopeService.assertBranchAccess(
          currentUser,
          user.staffProfile.branchId,
        );

        // ---------------------------------------------------------------------
        // Derive organizational hierarchy automatically from StaffProfile.
        // ---------------------------------------------------------------------

        dto.branchId =
          user.staffProfile.branchId;

        dto.districtId =
          user.staffProfile.branch.districtId;

        dto.regionId =
          user.staffProfile.branch.district.regionId;

        break;
      }

      // ========================================================================
      // INVALID
      // ========================================================================

      default:
        throw new BadRequestException(
          'Invalid target scope',
        );
    }
  }

  // ==========================================================================
  // GET ASSIGNMENTS
  // ==========================================================================

   // ==========================================================================
  // GET ASSIGNMENTS
  // ==========================================================================

  async findAssignments(
    targetId: string,
    currentUser: AuthenticatedUser,
  ) {
    await this.findOne(targetId);

    const assignments =
      await this.prisma.targetAssignment.findMany({
        where: {
          targetId,
        },

        include: {
          region: true,
          district: true,
          branch: true,
          product: true,

          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },

        orderBy: {
          createdAt: 'desc',
        },
      });

    // Global users can see every assignment.
    if (this.scopeService.isGlobal(currentUser)) {
      return assignments;
    }

    // Non-global users only receive assignments that fall inside
    // their authorized organizational scope.
    const visibleAssignments = [];

    for (const assignment of assignments) {
      try {
        switch (assignment.scopeType) {
          case 'GLOBAL': {
            // GLOBAL assignments are applicable to all users and
            // therefore safe to expose as inherited targets.
            visibleAssignments.push(assignment);
            break;
          }

          case 'REGION': {
            if (!assignment.regionId) {
              break;
            }

            await this.scopeService.assertRegionAccess(
              currentUser,
              assignment.regionId,
            );

            visibleAssignments.push(assignment);
            break;
          }

          case 'DISTRICT': {
            if (!assignment.districtId) {
              break;
            }

            await this.scopeService.assertDistrictAccess(
              currentUser,
              assignment.districtId,
            );

            visibleAssignments.push(assignment);
            break;
          }

          case 'BRANCH': {
            if (!assignment.branchId) {
              break;
            }

            await this.scopeService.assertBranchAccess(
              currentUser,
              assignment.branchId,
            );

            visibleAssignments.push(assignment);
            break;
          }

          case 'STAFF': {
            if (!assignment.branchId) {
              break;
            }

            await this.scopeService.assertBranchAccess(
              currentUser,
              assignment.branchId,
            );

            // A Digital Reskilled Staff user must only see their own
            // direct STAFF assignment.
            if (
              currentUser.roles.includes(
                'DIGITAL_RESKILLED_STAFF',
              ) &&
              assignment.userId !== currentUser.id
            ) {
              break;
            }

            visibleAssignments.push(assignment);
            break;
          }
        }
      } catch {
        // Assignment is outside the caller's organizational scope.
        // Do not expose it.
      }
    }

    return visibleAssignments;
  }

  // ==========================================================================
  // REMOVE ASSIGNMENT
  // ==========================================================================

  async removeAssignment(
    id: string,
    currentUser: AuthenticatedUser,
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

    // Global users can remove any assignment.
    if (!this.scopeService.isGlobal(currentUser)) {
      switch (assignment.scopeType) {
        case 'GLOBAL': {
          throw new BadRequestException(
            'Only global users can remove GLOBAL target assignments',
          );
        }

        case 'REGION': {
          if (!assignment.regionId) {
            throw new BadRequestException(
              'Target assignment has no region',
            );
          }

          await this.scopeService.assertRegionAccess(
            currentUser,
            assignment.regionId,
          );

          break;
        }

        case 'DISTRICT': {
          if (!assignment.districtId) {
            throw new BadRequestException(
              'Target assignment has no district',
            );
          }

          await this.scopeService.assertDistrictAccess(
            currentUser,
            assignment.districtId,
          );

          break;
        }

        case 'BRANCH': {
          if (!assignment.branchId) {
            throw new BadRequestException(
              'Target assignment has no branch',
            );
          }

          await this.scopeService.assertBranchAccess(
            currentUser,
            assignment.branchId,
          );

          break;
        }

        case 'STAFF': {
          if (!assignment.branchId) {
            throw new BadRequestException(
              'Target assignment has no branch',
            );
          }

          await this.scopeService.assertBranchAccess(
            currentUser,
            assignment.branchId,
          );

          break;
        }

        default: {
          throw new BadRequestException(
            'Invalid target assignment scope',
          );
        }
      }
    }

    await this.prisma.targetAssignment.delete({
      where: {
        id,
      },
    });

    return {
      success: true,
      message:
        'Target assignment removed successfully',
    };
  }
}