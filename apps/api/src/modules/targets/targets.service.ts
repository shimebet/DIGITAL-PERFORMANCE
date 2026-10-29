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
import {
  assertTargetAssignmentPermission,
} from './target-assignment-authorization.js';

import {
  Prisma,
} from '../../generated/prisma/client.js';

import {
  validateParentRequirement,
  validateParentAssignment,
} from './target-assignment-hierarchy.js';

import {
  validateAssignmentCapacity,
} from './target-assignment-capacity.js';

import {
  lockTargetAssignment,
} from '../../database/prisma/target-assignment-lock.js';



type AssignmentDatabase =
  | PrismaService
  | Prisma.TransactionClient;

@Injectable()
export class TargetsService {
  constructor(
    private readonly prisma: PrismaService,

    private readonly scopeService: ScopeService,
  ) { }

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
  async findOneScoped(
    id: string,
    currentUser: AuthenticatedUser,
  ) {
    const target = await this.findOne(id);

    const assignments =
      await this.findAssignments(
        id,
        currentUser,
      );

    return {
      ...target,
      assignments,
    };
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


  // ==========================================================================
  // ASSIGN TARGET
  // ==========================================================================

  async assign(
    dto: AssignTargetDto,
    currentUser: AuthenticatedUser,
  ) {
    validateParentRequirement({
      scopeType: dto.scopeType,
      parentAssignmentId: dto.parentAssignmentId,
    });

    // Preserve the existing pre-transaction authorization behavior.
    await this.validateAssignmentScope(dto, currentUser);

    return this.prisma.$transaction(async (tx) => {
      return this.createAssignmentInTransaction(tx, dto);
    });
  }

  // ==========================================================================
  // CREATE ASSIGNMENT WITHIN AN EXISTING TRANSACTION
  // ==========================================================================

  private async createAssignmentInTransaction(
    tx: Prisma.TransactionClient,
    dto: AssignTargetDto,
  ) {
    // 1. Lock the target before checking assignments.
    const targetRows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM targets
      WHERE id = ${dto.targetId}
      FOR UPDATE
    `;

    if (targetRows.length === 0) {
      throw new NotFoundException('Target not found');
    }

    // 2. Confirm that the target remains active.
    const target = await tx.target.findFirst({
      where: {
        id: dto.targetId,
        deletedAt: null,
        status: 'ACTIVE',
      },
    });

    if (!target) {
      throw new NotFoundException(
        'Target not found or inactive',
      );
    }

    // 3. Validate the selected product.
    if (dto.productId) {
      const product = await tx.product.findFirst({
        where: {
          id: dto.productId,
          deletedAt: null,
          status: 'ACTIVE',
        },
      });

      if (!product) {
        throw new NotFoundException(
          'Product not found or inactive',
        );
      }
    }

    // 4. Validate parent hierarchy and allocation capacity.
    if (dto.parentAssignmentId) {
      await lockTargetAssignment(
        tx,
        dto.parentAssignmentId,
      );

      const parent = await tx.targetAssignment.findUnique({
        where: {
          id: dto.parentAssignmentId,
        },
      });

      if (!parent) {
        throw new NotFoundException(
          'Parent target assignment not found',
        );
      }

      validateParentAssignment(
        {
          targetId: dto.targetId,
          scopeType: dto.scopeType,
          regionId: dto.regionId,
          districtId: dto.districtId,
          branchId: dto.branchId,
          userId: dto.userId,
          productId: dto.productId,
        },
        parent,
      );

      const existingAllocations =
        await tx.targetAssignment.aggregate({
          where: {
            parentAssignmentId: parent.id,
          },
          _sum: {
            targetValue: true,
          },
        });

      validateAssignmentCapacity(
        parent.targetValue,
        existingAllocations._sum.targetValue ??
          new Prisma.Decimal(0),
        dto.targetValue,
      );
    } else {
      // GLOBAL assignments have no parent.
      validateAssignmentCapacity(
        dto.targetValue,
        0,
        dto.targetValue,
      );
    }

    // 5. Check for an exact duplicate.
    const duplicate = await tx.targetAssignment.findFirst({
      where: {
        targetId: dto.targetId,
        scopeType: dto.scopeType,
        regionId: dto.regionId ?? null,
        districtId: dto.districtId ?? null,
        branchId: dto.branchId ?? null,
        userId: dto.userId ?? null,
        productId: dto.productId ?? null,
      },
    });

    if (duplicate) {
      throw new ConflictException(
        'Target already assigned to this scope and product',
      );
    }

    // 6. Check overlapping assignments.
    const overlappingAssignment =
      await tx.targetAssignment.findFirst({
        where: {
          scopeType: dto.scopeType,

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

    // 7. Create the assignment.
    return tx.targetAssignment.create({
      data: {
        targetId: dto.targetId,
        scopeType: dto.scopeType,
        parentAssignmentId:
          dto.parentAssignmentId ?? null,
        regionId: dto.regionId,
        districtId: dto.districtId,
        branchId: dto.branchId,
        userId: dto.userId,
        productId: dto.productId,
        targetValue: dto.targetValue,
      },
      include: {
        target: true,
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
    });
  }


  // ==========================================================================
  // VALIDATE TARGET ASSIGNMENT SCOPE
  // ==========================================================================


  // ==========================================================================
  // BATCH ASSIGN TARGETS
  // Used by CSV import confirmation.
  // ==========================================================================

  async assignBatch(
    assignments: AssignTargetDto[],
    currentUser: AuthenticatedUser,
  ): Promise<{ importedAssignments: number }> {
    if (assignments.length === 0) {
      throw new BadRequestException(
        'At least one target assignment is required',
      );
    }

    if (assignments.length > 2000) {
      throw new BadRequestException(
        'A maximum of 2000 target assignments is allowed',
      );
    }

    // Work with copies so caller-owned DTOs are not mutated.
    const normalizedAssignments = assignments.map(
      (assignment) => ({ ...assignment }),
    );

    // Validate the required parent relationship before opening
    // the transaction.
    for (const assignment of normalizedAssignments) {
      validateParentRequirement({
        scopeType: assignment.scopeType,
        parentAssignmentId: assignment.parentAssignmentId,
      });
    }

    // Use one transaction for all assignments.
    // If any row fails, all earlier inserts are rolled back.
    return this.prisma.$transaction(
      async (tx) => {
        // Authorization and canonical organizational IDs are
        // resolved through the transaction-aware method.
        for (const assignment of normalizedAssignments) {
          await this.validateAssignmentScope(
            assignment,
            currentUser,
            tx,
          );
        }

        // Process target IDs in a consistent order to reduce
        // lock-order conflicts between concurrent imports.
        normalizedAssignments.sort((a, b) =>
          a.targetId.localeCompare(b.targetId),
        );

        for (const assignment of normalizedAssignments) {
          await this.createAssignmentInTransaction(
            tx,
            assignment,
          );
        }

        return {
          importedAssignments:
            normalizedAssignments.length,
        };
      },
      {
        maxWait: 10000,
        timeout: 60000,
      },
    );
  }

  
  // ==========================================================================
  // VALIDATE BATCH ASSIGNMENTS WITHOUT COMMITTING
  // ==========================================================================

  async validateBatchPreview(
    assignments: AssignTargetDto[],
    currentUser: AuthenticatedUser,
  ): Promise<void> {
    if (assignments.length === 0) {
      throw new BadRequestException(
        'At least one target assignment is required',
      );
    }

    if (assignments.length > 2000) {
      throw new BadRequestException(
        'A maximum of 2000 target assignments is allowed',
      );
    }

    const normalizedAssignments = assignments.map(
      (assignment) => ({ ...assignment }),
    );

    for (const assignment of normalizedAssignments) {
      validateParentRequirement({
        scopeType: assignment.scopeType,
        parentAssignmentId: assignment.parentAssignmentId,
      });
    }

    // A unique sentinel error signals a successful dry run.
    // Throwing it forces Prisma to roll back the transaction.
    class PreviewRollback extends Error {}

    try {
      await this.prisma.$transaction(
        async (tx) => {
          for (const assignment of normalizedAssignments) {
            await this.validateAssignmentScope(
              assignment,
              currentUser,
              tx,
            );
          }

          normalizedAssignments.sort((a, b) =>
            a.targetId.localeCompare(b.targetId),
          );

          for (const assignment of normalizedAssignments) {
            await this.createAssignmentInTransaction(
              tx,
              assignment,
            );
          }

          // Validation passed, but preview must not commit.
          throw new PreviewRollback();
        },
        {
          maxWait: 10000,
          timeout: 60000,
        },
      );
    } catch (error) {
      if (error instanceof PreviewRollback) {
        return;
      }

      throw error;
    }
  }

  // ==========================================================================
  // VALIDATE TARGET ASSIGNMENT SCOPE
  // ==========================================================================

  private async validateAssignmentScope(
    dto: AssignTargetDto,
    currentUser: AuthenticatedUser,
    db: AssignmentDatabase = this.prisma,
  ): Promise<void> {
    switch (dto.scopeType) {
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

        // Only globally scoped users may create GLOBAL assignments.
        if (!this.scopeService.isGlobal(currentUser)) {
          throw new BadRequestException(
            'Only global users can assign GLOBAL targets',
          );
        }

        // Require target.create permission from an authorized global role.
        assertTargetAssignmentPermission(
          currentUser,
          'GLOBAL',
          {
            regionId: null,
            districtId: null,
            branchId: null,
          },
        );

        break;
      }

      // ========================================================================
      // REGION
      // ========================================================================

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

        // Only authorized global administrators can assign REGION targets.
        assertTargetAssignmentPermission(
          currentUser,
          'REGION',
          {
            regionId: dto.regionId,
            districtId: null,
            branchId: null,
          },
        );

        break;
      }

      // ========================================================================
      // DISTRICT
      // ========================================================================

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

        const district = await db.district.findFirst({
          where: {
            id: dto.districtId,
            deletedAt: null,
          },
        });

        if (!district) {
          throw new NotFoundException(
            'District not found',
          );
        }

        // Reject conflicting client-supplied hierarchy.
        if (
          dto.regionId &&
          dto.regionId !== district.regionId
        ) {
          throw new BadRequestException(
            'regionId does not match the selected district',
          );
        }

        // Derive the trusted region from the district record.
        dto.regionId = district.regionId;

        // Regional Managers may allocate only to districts in their region.
        assertTargetAssignmentPermission(
          currentUser,
          'DISTRICT',
          {
            regionId: district.regionId,
            districtId: district.id,
            branchId: null,
          },
        );

        break;
      }

      // ========================================================================
      // BRANCH
      // ========================================================================

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

        const branch = await db.branch.findFirst({
          where: {
            id: dto.branchId,
            deletedAt: null,
          },
          include: {
            district: true,
          },
        });

        if (!branch) {
          throw new NotFoundException(
            'Branch not found',
          );
        }

        if (
          dto.districtId &&
          dto.districtId !== branch.districtId
        ) {
          throw new BadRequestException(
            'districtId does not match the selected branch',
          );
        }

        if (
          dto.regionId &&
          dto.regionId !== branch.district.regionId
        ) {
          throw new BadRequestException(
            'regionId does not match the selected branch',
          );
        }

        // Derive trusted hierarchy from the branch record.
        dto.districtId = branch.districtId;
        dto.regionId = branch.district.regionId;

        // District Managers may allocate only to branches in their district.
        assertTargetAssignmentPermission(
          currentUser,
          'BRANCH',
          {
            regionId: branch.district.regionId,
            districtId: branch.districtId,
            branchId: branch.id,
          },
        );

        break;
      }

      // ========================================================================
      // STAFF
      // ========================================================================

      case 'STAFF': {
        if (!dto.userId) {
          throw new BadRequestException(
            'userId is required for STAFF target',
          );
        }

        const user = await db.user.findFirst({
          where: {
            id: dto.userId,
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

        const staffBranchId =
          user.staffProfile.branchId;

        const staffDistrictId =
          user.staffProfile.branch.districtId;

        const staffRegionId =
          user.staffProfile.branch.district.regionId;

        if (
          dto.branchId &&
          dto.branchId !== staffBranchId
        ) {
          throw new BadRequestException(
            'branchId does not match the selected staff member',
          );
        }

        if (
          dto.districtId &&
          dto.districtId !== staffDistrictId
        ) {
          throw new BadRequestException(
            'districtId does not match the selected staff member',
          );
        }

        if (
          dto.regionId &&
          dto.regionId !== staffRegionId
        ) {
          throw new BadRequestException(
            'regionId does not match the selected staff member',
          );
        }

        await this.scopeService.assertBranchAccess(
          currentUser,
          staffBranchId,
        );

        // Derive trusted hierarchy from the staff profile.
        dto.branchId = staffBranchId;
        dto.districtId = staffDistrictId;
        dto.regionId = staffRegionId;

        // Branch Managers may allocate only to staff in their branch.
        assertTargetAssignmentPermission(
          currentUser,
          'STAFF',
          {
            regionId: staffRegionId,
            districtId: staffDistrictId,
            branchId: staffBranchId,
          },
        );

        break;
      }

      // ========================================================================
      // INVALID
      // ========================================================================

      default: {
        throw new BadRequestException(
          'Invalid target scope',
        );
      }
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

  // ==========================================================================
  // REMOVE ASSIGNMENT
  // ==========================================================================

  async removeAssignment(
    id: string,
    currentUser: AuthenticatedUser,
  ) {
    // ------------------------------------------------------------------------
    // 1. Find the assignment
    // ------------------------------------------------------------------------

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

    // ------------------------------------------------------------------------
    // 2. Enforce role, permission and organizational scope
    // ------------------------------------------------------------------------

    assertTargetAssignmentPermission(
      currentUser,
      assignment.scopeType,
      {
        regionId: assignment.regionId,
        districtId: assignment.districtId,
        branchId: assignment.branchId,
      },
      'target.delete',
    );

    // ------------------------------------------------------------------------
    // 3. Prevent deletion of assignments with child allocations
    // ------------------------------------------------------------------------

    const childCount =
      await this.prisma.targetAssignment.count({
        where: {
          parentAssignmentId: assignment.id,
        },
      });

    if (childCount > 0) {
      throw new ConflictException(
        'Cannot delete this target assignment because it has child allocations. Remove or reassign the child allocations first.',
      );
    }

    // ------------------------------------------------------------------------
    // 4. Delete the authorized assignment
    // ------------------------------------------------------------------------

    return this.prisma.targetAssignment.delete({
      where: {
        id: assignment.id,
      },
    });
  }
}