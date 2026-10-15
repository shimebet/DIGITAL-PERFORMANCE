
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  PrismaService,
} from '../../database/prisma/prisma.service.js';

import {
  AssignUserRoleDto,
} from './dto/assign-user-role.dto.js';

@Injectable()
export class UserRolesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // ============================================================
  // ASSIGN USER ROLE
  // ============================================================

  async assign(dto: AssignUserRoleDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: dto.userId,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const role = await this.prisma.role.findFirst({
      where: {
        id: dto.roleId,
        status: 'ACTIVE',
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    await this.validateScope(dto);

    const existing = await this.prisma.userRole.findFirst({
      where: {
        userId: dto.userId,
        roleId: dto.roleId,
        scopeType: dto.scopeType,
        regionId: dto.regionId ?? null,
        districtId: dto.districtId ?? null,
        branchId: dto.branchId ?? null,
      },
    });

    if (existing) {
      throw new ConflictException(
        'User already has this role for the selected scope',
      );
    }

    return this.prisma.userRole.create({
      data: {
        userId: dto.userId,
        roleId: dto.roleId,
        scopeType: dto.scopeType,
        regionId: dto.regionId,
        districtId: dto.districtId,
        branchId: dto.branchId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        role: true,
        region: true,
        district: true,
        branch: true,
      },
    });
  }

  // ============================================================
  // VALIDATE ORGANIZATIONAL SCOPE
  // ============================================================

  private async validateScope(dto: AssignUserRoleDto) {
    switch (dto.scopeType) {
      case 'GLOBAL': {
        if (dto.regionId || dto.districtId || dto.branchId) {
          throw new BadRequestException(
            'GLOBAL scope must not contain regionId, districtId or branchId',
          );
        }

        break;
      }

      case 'REGION': {
        if (!dto.regionId) {
          throw new BadRequestException(
            'regionId is required for REGION scope',
          );
        }

        if (dto.districtId || dto.branchId) {
          throw new BadRequestException(
            'REGION scope must not contain districtId or branchId',
          );
        }

        const region = await this.prisma.region.findFirst({
          where: {
            id: dto.regionId,
            deletedAt: null,
          },
        });

        if (!region) {
          throw new NotFoundException('Region not found');
        }

        break;
      }

      case 'DISTRICT': {
        if (!dto.districtId) {
          throw new BadRequestException(
            'districtId is required for DISTRICT scope',
          );
        }

        if (dto.branchId) {
          throw new BadRequestException(
            'DISTRICT scope must not contain branchId',
          );
        }

        const district = await this.prisma.district.findFirst({
          where: {
            id: dto.districtId,
            deletedAt: null,
          },
          include: {
            region: true,
          },
        });

        if (!district) {
          throw new NotFoundException('District not found');
        }

        if (
          dto.regionId &&
          dto.regionId !== district.regionId
        ) {
          throw new BadRequestException(
            'Selected district does not belong to the provided region',
          );
        }

        dto.regionId = district.regionId;

        break;
      }

      case 'BRANCH': {
        if (!dto.branchId) {
          throw new BadRequestException(
            'branchId is required for BRANCH scope',
          );
        }

        const branch = await this.prisma.branch.findFirst({
          where: {
            id: dto.branchId,
            deletedAt: null,
          },
          include: {
            district: true,
          },
        });

        if (!branch) {
          throw new NotFoundException('Branch not found');
        }

        if (
          dto.districtId &&
          dto.districtId !== branch.districtId
        ) {
          throw new BadRequestException(
            'Selected branch does not belong to the provided district',
          );
        }

        dto.districtId = branch.districtId;
        dto.regionId = branch.district.regionId;

        break;
      }

      case 'STAFF': {
        if (dto.regionId || dto.districtId || dto.branchId) {
          throw new BadRequestException(
            'STAFF scope does not require organization IDs',
          );
        }

        break;
      }

      default:
        throw new BadRequestException('Invalid scope type');
    }
  }

  // ============================================================
  // GET ROLES ASSIGNED TO USER
  // ============================================================

  async findByUser(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.userRole.findMany({
      where: {
        userId,
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        region: true,
        district: true,
        branch: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // ============================================================
  // REMOVE ROLE ASSIGNMENT
  // PROTECT LAST ACTIVE GLOBAL ADMINISTRATOR
  // ============================================================

  async remove(id: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const assignment = await tx.userRole.findUnique({
          where: {
            id,
          },
          include: {
            role: {
              select: {
                code: true,
              },
            },
            user: {
              select: {
                id: true,
                status: true,
                deletedAt: true,
              },
            },
          },
        });

        if (!assignment) {
          throw new NotFoundException(
            'Role assignment not found',
          );
        }

        const administratorRoles = [
          'SUPER_ADMIN',
          'SYSTEM_ADMIN',
        ];

        const isGlobalAdminAssignment =
          assignment.scopeType === 'GLOBAL' &&
          administratorRoles.includes(assignment.role.code);

        if (
          isGlobalAdminAssignment &&
          assignment.user.status === 'ACTIVE' &&
          assignment.user.deletedAt === null
        ) {
          // Check whether this user has another global
          // administrator role assignment.

          const remainingAdminAssignments =
            await tx.userRole.count({
              where: {
                userId: assignment.userId,
                id: {
                  not: id,
                },
                scopeType: 'GLOBAL',
                role: {
                  code: {
                    in: administratorRoles,
                  },
                },
              },
            });

          if (remainingAdminAssignments === 0) {
            // Check for other active global administrators.

            const otherActiveGlobalAdmins =
              await tx.user.count({
                where: {
                  id: {
                    not: assignment.userId,
                  },
                  status: 'ACTIVE',
                  deletedAt: null,
                  roles: {
                    some: {
                      scopeType: 'GLOBAL',
                      role: {
                        code: {
                          in: administratorRoles,
                        },
                      },
                    },
                  },
                },
              });

            if (otherActiveGlobalAdmins === 0) {
              throw new ForbiddenException(
                'Cannot remove the last active global administrator',
              );
            }
          }
        }

        // Delete the role assignment only after validation.

        await tx.userRole.delete({
          where: {
            id,
          },
        });

        return {
          success: true,
          message: 'Role assignment removed successfully',
        };
      },
      {
        isolationLevel: 'Serializable',
      },
    );
  }
}
