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

import {
  ReassignFollowUpDto,
} from './dto/reassign-follow-up.dto.js';
import {
  hasScopedPermission,
} from '../auth/services/scoped-permission.js';


@Injectable()
export class FollowUpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
  ) { }
  async eligibleStaff(currentUser: AuthenticatedUser) {
    // Only users with an active, scoped management assignment
    // granting followup.create may retrieve staff options.
    const assignments =
      currentUser.roleAssignments?.filter(
        (assignment) =>
          assignment.permissions?.includes('followup.create') &&
          [
            'BRANCH_MANAGER',
            'DISTRICT_MANAGER',
            'REGIONAL_MANAGER',
          ].includes(assignment.roleCode),
      ) ?? [];

    if (assignments.length === 0) {
      throw new ForbiddenException(
        'You are not authorized to assign follow-ups',
      );
    }

    const branchIds = assignments
      .filter(
        (assignment) =>
          assignment.scopeType === 'BRANCH' &&
          assignment.branchId,
      )
      .map((assignment) => assignment.branchId!);

    const districtIds = assignments
      .filter(
        (assignment) =>
          assignment.scopeType === 'DISTRICT' &&
          assignment.districtId,
      )
      .map((assignment) => assignment.districtId!);

    const regionIds = assignments
      .filter(
        (assignment) =>
          assignment.scopeType === 'REGION' &&
          assignment.regionId,
      )
      .map((assignment) => assignment.regionId!);

    const branchFilters = [
      ...(branchIds.length > 0
        ? [{ branchId: { in: branchIds } }]
        : []),

      ...(districtIds.length > 0
        ? [{
          branch: {
            districtId: { in: districtIds },
          },
        }]
        : []),

      ...(regionIds.length > 0
        ? [{
          branch: {
            district: {
              regionId: { in: regionIds },
            },
          },
        }]
        : []),
    ];

    if (branchFilters.length === 0) {
      throw new ForbiddenException(
        'No authorized branch scope found',
      );
    }

   const staff = await this.prisma.staffProfile.findMany({
  where: {
    status: 'ACTIVE',
    digitalReskilled: true,

    OR: branchFilters,

    user: {
      deletedAt: null,
      status: 'ACTIVE',
      roles: {
        some: {
          role: {
            code: 'DIGITAL_RESKILLED_STAFF',
            status: 'ACTIVE',
          },
        },
      },
    },

    branch: {
      deletedAt: null,
      district: {
        deletedAt: null,
      },
    },
  },

  select: {
    branchId: true,
    status: true,

    branch: {
      select: {
        name: true,
      },
    },

    user: {
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        status: true,
      },
    },
  },
});

return staff.map((profile) => ({
  ...profile.user,
  staffProfile: {
    branchId: profile.branchId,
    status: profile.status,
    branch: profile.branch,
  },
}));
  }
  // ==========================================================================
  // CREATE
  // ==========================================================================

  async create(
    dto: CreateFollowUpDto,
    currentUser: AuthenticatedUser,
  ) {
const now = new Date();

const assignedUser = await this.prisma.user.findFirst({
  where: {
    id: dto.assignedToUserId,
    deletedAt: null,
    status: 'ACTIVE',

    staffProfile: {
      is: {
        status: 'ACTIVE',
        digitalReskilled: true,
      },
    },

    roles: {
      some: {
        role: {
          code: 'DIGITAL_RESKILLED_STAFF',
          status: 'ACTIVE',
        },
        AND: [
          {
            OR: [
              { validFrom: null },
              { validFrom: { lte: now } },
            ],
          },
          {
            OR: [
              { validTo: null },
              { validTo: { gte: now } },
            ],
          },
        ],
      },
    },
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


    const assignedBranch =
      assignedUser.staffProfile.branch;

    const canCreateFollowUp = hasScopedPermission(
      currentUser,
      'followup.create',
      {
        branchId: assignedUser.staffProfile.branchId,
        districtId: assignedBranch.districtId,
        regionId: assignedBranch.district.regionId,
      },
      [
        'SUPER_ADMIN',
        'SYSTEM_ADMIN',
        'REGIONAL_MANAGER',
        'DISTRICT_MANAGER',
        'BRANCH_MANAGER',
      ],
    );

    if (!canCreateFollowUp) {
      throw new ForbiddenException(
        'You do not have permission to create follow-ups in this branch',
      );
    }


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
  // 1. Retrieve the linked activity
  const activity = await this.prisma.activity.findUnique({
    where: {
      id: dto.activityId,
    },
  });

  // 2. Verify that the activity exists
  if (!activity) {
    throw new NotFoundException(
      'Activity not found',
    );
  }

  // 3. Verify the current user can access the activity branch
  await this.scopeService.assertBranchAccess(
    currentUser,
    activity.branchId,
  );

  // 4. Ensure the activity belongs to the assigned staff's branch
  if (
    activity.branchId !== assignedUser.staffProfile.branchId
  ) {
    throw new BadRequestException(
      'Linked activity must belong to the assigned staff branch',
    );
  }
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
        isEnabled: true,
        deletedAt: null,
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
        isEnabled: true,
        deletedAt: null,

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


  private canAccessFollowUp(
    user: AuthenticatedUser,
    followUp: {
      assignedToUserId: string | null;
      branchId: string;
      branch: {
        districtId: string;
        district: {
          regionId: string;
        };
      };
    },
    permission: 'followup.read' | 'followup.update',
  ): boolean {
    const resource = {
      branchId: followUp.branchId,
      districtId: followUp.branch.districtId,
      regionId: followUp.branch.district.regionId,
    };

    // Digital Reskilled Staff may access only their
    // own assigned follow-ups when their STAFF role
    // explicitly grants the requested permission.
    if (followUp.assignedToUserId === user.id) {
      const hasStaffPermission =
        user.roleAssignments?.some(
          (assignment) =>
            assignment.roleCode === 'DIGITAL_RESKILLED_STAFF' &&
            assignment.scopeType === 'STAFF' &&
            assignment.permissions?.includes(permission),
        ) === true;

      if (hasStaffPermission) {
        return true;
      }
    }

    // Administrative access requires an authorized
    // GLOBAL role assignment with the permission.
    const hasGlobalAdminPermission =
      user.roleAssignments?.some(
        (assignment) =>
          (assignment.roleCode === 'SUPER_ADMIN' ||
            assignment.roleCode === 'SYSTEM_ADMIN') &&
          assignment.scopeType === 'GLOBAL' &&
          assignment.permissions?.includes(permission),
      ) === true;

    if (hasGlobalAdminPermission) {
      return true;
    }

    // Organizational access is limited to management roles.
    // Permission and organizational scope must belong
    // to the SAME authenticated role assignment.
    return hasScopedPermission(
      user,
      permission,
      resource,
      [
        'REGIONAL_MANAGER',
        'DISTRICT_MANAGER',
        'BRANCH_MANAGER',
      ],
    );
  }


  // ==========================================================================
  // FIND ALL SCOPED
  // ==========================================================================


  // ==========================================================================
  // FIND ALL SCOPED - PERMISSION-AWARE VISIBILITY
  // ==========================================================================

  async findAllScoped(user: AuthenticatedUser) {
    const assignments = user.roleAssignments ?? [];

    const filters: Array<Record<string, unknown>> = [];

    const managerRoles = new Set([
      'REGIONAL_MANAGER',
      'DISTRICT_MANAGER',
      'BRANCH_MANAGER',
    ]);

    const globalAdminRoles = new Set([
      'SUPER_ADMIN',
      'SYSTEM_ADMIN',
    ]);

    for (const assignment of assignments) {
      // Permission must belong to this specific role assignment.
      if (!assignment.permissions?.includes('followup.read')) {
        continue;
      }

      // Global access requires an administrator role
      // explicitly assigned at GLOBAL scope.
      if (
        assignment.scopeType === 'GLOBAL' &&
        globalAdminRoles.has(assignment.roleCode)
      ) {
        filters.push({});
        continue;
      }

      // Staff access is limited to their own assignments.
      if (
        assignment.roleCode === 'DIGITAL_RESKILLED_STAFF' &&
        assignment.scopeType === 'STAFF'
      ) {
        filters.push({
          assignedToUserId: user.id,
        });

        continue;
      }

      // Only managerial roles may list organizational records.
      if (!managerRoles.has(assignment.roleCode)) {
        continue;
      }

      if (
        assignment.scopeType === 'REGION' &&
        assignment.regionId
      ) {
        filters.push({
          branch: {
            district: {
              regionId: assignment.regionId,
            },
          },
        });

        continue;
      }

      if (
        assignment.scopeType === 'DISTRICT' &&
        assignment.districtId
      ) {
        filters.push({
          branch: {
            districtId: assignment.districtId,
          },
        });

        continue;
      }

      if (
        assignment.scopeType === 'BRANCH' &&
        assignment.branchId
      ) {
        filters.push({
          branchId: assignment.branchId,
        });
      }
    }

    // Fail closed: users without an authorized filter
    // must not receive any follow-up records.
    if (filters.length === 0) {
      return [];
    }

    const hasGlobalAccess = filters.some(
      (filter) => Object.keys(filter).length === 0,
    );

    return this.prisma.followUp.findMany({
      where: {
        deletedAt: null,

        ...(hasGlobalAccess
          ? {}
          : {
              OR: filters,
            }),
      },

      include: {
        product: true,

        branch: {
          include: {
            district: {
              include: {
                region: true,
              },
            },
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

      orderBy: {
        followUpDate: 'desc',
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
      await this.prisma.followUp.findFirst({
        where: { id, deletedAt: null },

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
  !this.canAccessFollowUp(
    user,
    followUp,
    'followup.read',
  )
) {
  throw new ForbiddenException(
    'You do not have permission to view this follow-up',
  );
}

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

if (
  !this.canAccessFollowUp(
    user,
    existing,
    'followup.update',
  )
) {
  throw new ForbiddenException(
    'You do not have permission to edit this follow-up',
  );
}

    if (!existing.isEnabled || existing.deletedAt) {
      throw new BadRequestException(
        'Disabled or deleted follow-ups cannot be edited',
      );
    }

    if (Object.prototype.hasOwnProperty.call(dto, 'assignedToUserId')) {
      throw new BadRequestException(
        'Use the dedicated reassignment endpoint to change assigned staff',
      );
    }

    if (dto.productId) {
      const product = await this.prisma.product.findFirst({
        where: {
          id: dto.productId,
          status: 'ACTIVE',
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (!product) {
        throw new NotFoundException(
          'Active product not found',
        );
      }
    }

    return this.prisma.followUp.update({
      where: {
        id,
        deletedAt: null,
        isEnabled: true,
      },

      data: {
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

 
  // ==========================================================================
  // UPDATE FOLLOW-UP STATUS + HISTORY
  // ==========================================================================

  async updateStatus(
    id: string,
    dto: UpdateFollowUpStatusDto,
    user: AuthenticatedUser,
  ) {
    const followUp = await this.findOne(id, user);

    // 1. Reject disabled or deleted follow-ups
    if (!followUp.isEnabled || followUp.deletedAt) {
      throw new BadRequestException(
        'Disabled or deleted follow-ups cannot change status',
      );
    }

    // 2. Protect completed follow-ups from further status changes
    const completedStatuses = [
      'CONVERTED',
      'NOT_INTERESTED',
      'UNREACHABLE',
      'CLOSED',
    ] as const;

    const isCompletedStatus = (status: string): boolean =>
      completedStatuses.some(
        (completedStatus) => completedStatus === status,
      );

    if (isCompletedStatus(followUp.status)) {
      throw new BadRequestException(
        'Completed follow-ups cannot change status. ' +
          'Contact an authorized manager if correction is required.',
      );
    }

    // 3. Prevent duplicate status changes
    if (dto.status === followUp.status) {
      throw new BadRequestException(
        'New status must differ from the current status',
      );
    }

    // 4. Enforce role-specific update permission and scope.
    // Permission and organizational scope must come from
    // the same authenticated role assignment.
    if (
      !this.canAccessFollowUp(
        user,
        followUp,
        'followup.update',
      )
    ) {
      throw new ForbiddenException(
        'You do not have permission to update this follow-up status',
      );
    }


    // 5. Validate rescheduling requirements
    if (
      dto.status === 'RESCHEDULED' &&
      !dto.nextFollowUpDate
    ) {
      throw new BadRequestException(
        'nextFollowUpDate is required when status is RESCHEDULED',
      );
    }

    // 6. Validate the supplied date
    if (dto.status === 'RESCHEDULED') {
      const nextDate = new Date(dto.nextFollowUpDate!);

      if (Number.isNaN(nextDate.getTime())) {
        throw new BadRequestException(
          'Invalid next follow-up date',
        );
      }
    }

    // 7. Update follow-up and create audit history atomically
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.followUp.update({
        where: {
          id,
          deletedAt: null,
          isEnabled: true,
          status: followUp.status,
        },
        data: {
          status: dto.status,

          outcome:
            dto.outcome !== undefined
              ? dto.outcome.trim()
              : undefined,

          nextFollowUpDate:
            dto.status === 'RESCHEDULED'
              ? new Date(dto.nextFollowUpDate!)
              : null,

          completedAt: isCompletedStatus(dto.status)
            ? new Date()
            : null,
        },
      });

      await tx.followUpHistory.create({
        data: {
          followUpId: id,
          changedByUserId: user.id,
          previousStatus: followUp.status,
          newStatus: dto.status,
          note: dto.note?.trim(),
        },
      });

      return updated;
    });
  }

  // ==========================================================================
  // ==========================================================================
  // FOLLOW-UP LIFECYCLE
  // ==========================================================================

  private async assertLifecycleAccess(
    id: string,
    user: AuthenticatedUser,
    permission: 'followup.manage' | 'followup.delete' | 'followup.reassign',
  ) {
    const followUp = await this.prisma.followUp.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        branchId: true,
        isEnabled: true,
        assignedToUserId: true,
      },
    });

    if (!followUp) {
      throw new NotFoundException('Follow-up not found');
    }

    const now = new Date();

    const assignments = await this.prisma.userRole.findMany({
      where: {
        userId: user.id,
        OR: [
          { validFrom: null },
          { validFrom: { lte: now } },
        ],
        AND: [
          {
            OR: [
              { validTo: null },
              { validTo: { gte: now } },
            ],
          },
        ],
        role: {
          status: 'ACTIVE',
          rolePermissions: {
            some: {
              permission: {
                code: permission,
                status: 'ACTIVE',
              },
            },
          },
        },
      },
      select: {
        scopeType: true,
        regionId: true,
        districtId: true,
        branchId: true,
        role: {
          select: {
            code: true,
          },
        },
      },
    });

    if (assignments.length === 0) {
      throw new ForbiddenException(
        'You do not have permission to manage this follow-up',
      );
    }

    const branch = await this.prisma.branch.findFirst({
      where: {
        id: followUp.branchId,
        deletedAt: null,
        district: {
          deletedAt: null,
          region: {
            deletedAt: null,
          },
        },
      },
      select: {
        id: true,
        districtId: true,
        district: {
          select: {
            regionId: true,
          },
        },
      },
    });

    if (!branch) {
      throw new ForbiddenException(
        'Follow-up branch is not accessible',
      );
    }

    const allowed = assignments.some((assignment) => {
      switch (assignment.scopeType) {
        case 'GLOBAL':
          return (
            assignment.role.code === 'SUPER_ADMIN' ||
            assignment.role.code === 'SYSTEM_ADMIN'
          );

        case 'REGION':
          return (
            assignment.regionId !== null &&
            assignment.regionId === branch.district.regionId
          );

        case 'DISTRICT':
          return (
            assignment.districtId !== null &&
            assignment.districtId === branch.districtId
          );

        case 'BRANCH':
          return (
            assignment.branchId !== null &&
            assignment.branchId === branch.id
          );

        default:
          return false;
      }
    });

    if (!allowed) {
      throw new ForbiddenException(
        'You do not have lifecycle permission for this branch',
      );
    }

    return followUp;
  }

  async reassignmentOptions(
    id: string,
    user: AuthenticatedUser,
  ) {
    const existing = await this.assertLifecycleAccess(
      id,
      user,
      'followup.reassign',
    );

    if (!existing.isEnabled) {
      throw new BadRequestException(
        'Disabled follow-ups cannot be reassigned',
      );
    }

    return this.prisma.user.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        id: {
          not: existing.assignedToUserId,
        },
        staffProfile: {
          is: {
            status: 'ACTIVE',
            branchId: existing.branchId,
          },
        },
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' },
      ],
    });
  }
  async reassign(
    id: string,
    dto: ReassignFollowUpDto,
    user: AuthenticatedUser,
  ) {
    const existing = await this.assertLifecycleAccess(
      id,
      user,
      'followup.reassign',
    );

    if (!existing.isEnabled) {
      throw new BadRequestException(
        'Disabled follow-ups cannot be reassigned',
      );
    }

    if (existing.assignedToUserId === dto.assignedToUserId) {
      throw new BadRequestException(
        'Follow-up is already assigned to this employee',
      );
    }

    const replacement = await this.prisma.user.findFirst({
      where: {
        id: dto.assignedToUserId,
        deletedAt: null,
        status: 'ACTIVE',
        staffProfile: {
          is: {
            status: 'ACTIVE',
            branchId: existing.branchId,
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (!replacement) {
      throw new BadRequestException(
        'Replacement employee must be active and belong to the follow-up branch',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const eligibleReplacement = await tx.user.findFirst({
        where: {
          id: replacement.id,
          deletedAt: null,
          status: 'ACTIVE',
          staffProfile: {
            is: {
              status: 'ACTIVE',
              branchId: existing.branchId,
            },
          },
        },
        select: {
          id: true,
        },
      });

      if (!eligibleReplacement) {
        throw new BadRequestException(
          'Replacement employee is no longer eligible',
        );
      }

      const result = await tx.followUp.updateMany({
        where: {
          id,
          branchId: existing.branchId,
          assignedToUserId: existing.assignedToUserId,
          deletedAt: null,
          isEnabled: true,
        },
        data: {
          assignedToUserId: replacement.id,
        },
      });

      if (result.count !== 1) {
        throw new BadRequestException(
          'Follow-up assignment changed. Refresh and try again.',
        );
      }

      const updated = await tx.followUp.findUniqueOrThrow({
        where: { id },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'ASSIGN',
          module: 'FOLLOW_UPS',
          entityType: 'FollowUp',
          entityId: id,
          description: 'Follow-up reassigned to another employee',
          oldValue: {
            assignedToUserId: existing.assignedToUserId,
          },
          newValue: {
            assignedToUserId: replacement.id,
          },
        },
      });

      return updated;
    });
  }
  async enable(
    id: string,
    user: AuthenticatedUser,
  ) {
    const existing = await this.assertLifecycleAccess(
      id,
      user,
      'followup.manage',
    );

    if (existing.isEnabled) {
      throw new BadRequestException(
        'Follow-up is already enabled',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const result = await tx.followUp.updateMany({
        where: {
          id,
          deletedAt: null,
          isEnabled: false,
        },
        data: {
          isEnabled: true,
          disabledAt: null,
          disabledByUserId: null,
        },
      });

      if (result.count !== 1) {
        throw new BadRequestException(
          'Follow-up state changed. Refresh and try again.',
        );
      }

      const updated = await tx.followUp.findUniqueOrThrow({
        where: { id },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'UPDATE',
          module: 'FOLLOW_UPS',
          entityType: 'FollowUp',
          entityId: id,
          description: 'Follow-up enabled',
          oldValue: {
            isEnabled: existing.isEnabled,
          },
          newValue: {
            isEnabled: true,
          },
        },
      });

      return updated;
    });
  }

  async disable(
    id: string,
    user: AuthenticatedUser,
  ) {
    const existing = await this.assertLifecycleAccess(
      id,
      user,
      'followup.manage',
    );

    if (!existing.isEnabled) {
      throw new BadRequestException(
        'Follow-up is already disabled',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const result = await tx.followUp.updateMany({
        where: {
          id,
          deletedAt: null,
          isEnabled: true,
        },
        data: {
          isEnabled: false,
          disabledAt: new Date(),
          disabledByUserId: user.id,
        },
      });

      if (result.count !== 1) {
        throw new BadRequestException(
          'Follow-up state changed. Refresh and try again.',
        );
      }

      const updated = await tx.followUp.findUniqueOrThrow({
        where: { id },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'UPDATE',
          module: 'FOLLOW_UPS',
          entityType: 'FollowUp',
          entityId: id,
          description: 'Follow-up disabled',
          oldValue: {
            isEnabled: existing.isEnabled,
          },
          newValue: {
            isEnabled: false,
          },
        },
      });

      return updated;
    });
  }

  async softDelete(
    id: string,
    user: AuthenticatedUser,
  ) {
    const existing = await this.assertLifecycleAccess(
      id,
      user,
      'followup.delete',
    );

    return this.prisma.$transaction(async (tx) => {
      const result = await tx.followUp.updateMany({
        where: {
          id,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
          deletedByUserId: user.id,
        },
      });

      if (result.count !== 1) {
        throw new BadRequestException(
          'Follow-up was already deleted or changed.',
        );
      }

      const updated = await tx.followUp.findUniqueOrThrow({
        where: { id },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'DELETE',
          module: 'FOLLOW_UPS',
          entityType: 'FollowUp',
          entityId: id,
          description: 'Follow-up soft-deleted',
          oldValue: {
            deletedAt: null,
            isEnabled: existing.isEnabled,
          },
          newValue: {
            deletedAt: updated.deletedAt?.toISOString(),
            isEnabled: updated.isEnabled,
          },
        },
      });

      return {
        success: true,
        message: 'Follow-up deleted successfully',
      };
    });
  }
  // SUMMARY
  // ==========================================================================

  async summary(
    user: AuthenticatedUser,
  ) {
    const all = (await this.findAllScoped(user)).filter(
      (item) => item.isEnabled,
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