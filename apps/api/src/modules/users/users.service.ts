
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import * as argon2 from 'argon2';

import { PrismaService } from '../../database/prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

const ADMIN_ROLE_CODES = [
  'SUPER_ADMIN',
  'SYSTEM_ADMIN',
];

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  // ============================================================
  // CREATE USER
  // ============================================================

  async create(dto: CreateUserDto) {
    const username = dto.username.trim().toLowerCase();

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username },
          ...(dto.email
            ? [{ email: dto.email.trim().toLowerCase() }]
            : []),
        ],
      },
    });

    if (existing) {
      throw new ConflictException(
        'Username or email already exists',
      );
    }

    if (dto.branchId) {
      await this.ensureBranchExists(dto.branchId);
    }

    const passwordHash = await argon2.hash(
      dto.password,
    );

    return this.prisma.user.create({
      data: {
        username,
        email: dto.email?.trim().toLowerCase(),
        phone: dto.phone?.trim(),
        passwordHash,
        firstName: dto.firstName.trim(),
        middleName: dto.middleName?.trim(),
        lastName: dto.lastName.trim(),
        mustChangePassword: true,

        ...(dto.branchId
          ? {
            staffProfile: {
              create: {
                branchId: dto.branchId,
                employeeNumber:
                  dto.employeeNumber?.trim(),
                jobTitle: dto.jobTitle?.trim(),
                digitalReskilled:
                  dto.digitalReskilled ?? true,
              },
            },
          }
          : {}),
      },

      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        firstName: true,
        middleName: true,
        lastName: true,
        status: true,
        createdAt: true,
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
  }

  // ============================================================
  // LIST USERS
  // ============================================================

  async findAll() {
    return this.prisma.user.findMany({
      where: {
        deletedAt: null,
      },

      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        firstName: true,
        middleName: true,
        lastName: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,

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

        roles: {
          include: {
            role: true,
            region: true,
            district: true,
            branch: true,
          },
        },
      },

      orderBy: {
        firstName: 'asc',
      },
    });
  }

  // ============================================================
  // GET USER
  // ============================================================

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },

      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        firstName: true,
        middleName: true,
        lastName: true,
        status: true,
        mfaEnabled: true,
        mustChangePassword: true,
        lastLoginAt: true,
        createdAt: true,

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

        roles: {
          include: {
            role: true,
            region: true,
            district: true,
            branch: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  // ============================================================
  // INTERNAL: BRANCH VALIDATION
  // ============================================================

  private async ensureBranchExists(branchId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: {
        id: branchId,
        deletedAt: null,
      },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
  }

  // ============================================================
  // INTERNAL: PROTECT LAST GLOBAL ADMIN
  // Call inside the same transaction as the change.
  // ============================================================

  private async protectLastGlobalAdmin(
    tx: Parameters<
      Parameters<PrismaService['$transaction']>[0]
    >[0],
    userId: string,
  ) {
    const globalAdminAssignment =
      await tx.userRole.findFirst({
        where: {
          userId,
          scopeType: 'GLOBAL',
          role: {
            code: {
              in: ADMIN_ROLE_CODES,
            },
            status: 'ACTIVE',
          },
        },
      });

    if (!globalAdminAssignment) {
      return;
    }

    const otherActiveAdmins = await tx.user.count({
      where: {
        id: {
          not: userId,
        },
        status: 'ACTIVE',
        deletedAt: null,
        roles: {
          some: {
            scopeType: 'GLOBAL',
            role: {
              code: {
                in: ADMIN_ROLE_CODES,
              },
              status: 'ACTIVE',
            },
          },
        },
      },
    });

    if (otherActiveAdmins === 0) {
      throw new ForbiddenException(
        'Cannot disable or delete the last active global administrator',
      );
    }
  }

  // ============================================================
  // INTERNAL: REVOKE SESSIONS
  // ============================================================

  private async revokeUserSessions(
    tx: Parameters<
      Parameters<PrismaService['$transaction']>[0]
    >[0],
    userId: string,
    now: Date,
  ) {
    await tx.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: now,
      },
    });

    await tx.userSession.updateMany({
      where: {
        userId,
        status: 'ACTIVE',
      },
      data: {
        status: 'REVOKED',
        revokedAt: now,
      },
    });
  }

  // ============================================================
  // UPDATE USER
  // ============================================================

  
  async update(
    id: string,
    dto: UpdateUserDto,
    actorId?: string,
  ) {
    if (dto.branchId) {
      await this.ensureBranchExists(dto.branchId);
    }

    try {
      await this.prisma.$transaction(
        async (tx) => {
          const existing = await tx.user.findFirst({
            where: {
              id,
              deletedAt: null,
            },
          });

          if (!existing) {
            throw new NotFoundException('User not found');
          }

          const updatedUsername =
            dto.username === undefined
              ? existing.username
              : dto.username.trim().toLowerCase();

          if (!updatedUsername) {
            throw new ConflictException(
              'Username cannot be empty',
            );
          }

          const usernameChanged =
            updatedUsername !== existing.username;

          if (usernameChanged) {
            const duplicate = await tx.user.findFirst({
              where: {
                username: updatedUsername,
                id: { not: id },
              },
              select: {
                id: true,
              },
            });

            if (duplicate) {
              throw new ConflictException(
                'Username already exists',
              );
            }
          }

          const statusChanged =
            dto.status !== undefined &&
            dto.status !== existing.status;

          const restrictingAccess =
            statusChanged &&
            dto.status !== 'ACTIVE';

          if (restrictingAccess) {
            if (actorId === id) {
              throw new ForbiddenException(
                'You cannot deactivate, lock, or suspend your own account',
              );
            }

            if (existing.status === 'ACTIVE') {
              await this.protectLastGlobalAdmin(tx, id);
            }
          }

          await tx.user.update({
            where: {
              id,
            },
            data: {
              username: usernameChanged
                ? updatedUsername
                : undefined,
              email: dto.email?.trim().toLowerCase(),
              phone: dto.phone?.trim(),
              firstName: dto.firstName?.trim(),
              middleName: dto.middleName?.trim(),
              lastName: dto.lastName?.trim(),
              status: dto.status,

              ...(dto.status === 'ACTIVE'
                ? {
                    failedLoginAttempts: 0,
                    lockedUntil: null,
                  }
                : {}),
            },
          });

          // Preserve the existing staff-profile update behavior.
          if (dto.branchId) {
            await tx.staffProfile.upsert({
              where: {
                userId: id,
              },
              update: {
                branchId: dto.branchId,
                employeeNumber:
                  dto.employeeNumber?.trim(),
                jobTitle:
                  dto.jobTitle?.trim(),
              },
              create: {
                userId: id,
                branchId: dto.branchId,
                employeeNumber:
                  dto.employeeNumber?.trim(),
                jobTitle:
                  dto.jobTitle?.trim(),
              },
            });
          }

          // A username change requires the user to sign in again.
          if (restrictingAccess || usernameChanged) {
            await this.revokeUserSessions(
              tx,
              id,
              new Date(),
            );
          }

          let description = 'User account profile updated';

          if (usernameChanged && statusChanged) {
            description =
              'User account username and status changed';
          } else if (usernameChanged) {
            description =
              'User account username changed';
          } else if (statusChanged) {
            description =
              `User account status changed from ${existing.status} to ${dto.status}`;
          }

          await tx.auditLog.create({
            data: {
              userId: actorId ?? null,
              action: 'UPDATE',
              module: 'USERS',
              entityType: 'User',
              entityId: id,
              description,
              oldValue: {
                username: existing.username,
                status: existing.status,
              },
              newValue: {
                username: updatedUsername,
                status: dto.status ?? existing.status,
              },
            },
          });
        },
        {
          isolationLevel: 'Serializable',
        },
      );
    } catch (error: unknown) {
      // Prisma unique-constraint violations can occur even
      // after a duplicate check when requests are concurrent.
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Username or another unique field already exists',
        );
      }

      throw error;
    }

    return this.findOne(id);
  }


  // ============================================================
  // SOFT DELETE USER
  // ============================================================

  async softDelete(
    id: string,
    actorId?: string,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const existing = await tx.user.findFirst({
          where: {
            id,
            deletedAt: null,
          },
        });

        if (!existing) {
          throw new NotFoundException('User not found');
        }

        if (actorId === id) {
          throw new ForbiddenException(
            'You cannot delete your own account',
          );
        }

        if (existing.status === 'ACTIVE') {
          await this.protectLastGlobalAdmin(tx, id);
        }

        const now = new Date();

        await tx.user.update({
          where: {
            id,
          },
          data: {
            deletedAt: now,
            status: 'INACTIVE',
          },
        });

        await this.revokeUserSessions(
          tx,
          id,
          now,
        );

        await tx.auditLog.create({
          data: {
            userId: actorId ?? null,
            action: 'DELETE',
            module: 'USERS',
            entityType: 'User',
            entityId: id,
            description: 'User account soft deleted',
            oldValue: {
              status: existing.status,
              deleted: false,
            },
            newValue: {
              status: 'INACTIVE',
              deleted: true,
            },
          },
        });

        return {
          success: true,
          message: 'User deleted successfully',
        };
      },
      {
        isolationLevel: 'Serializable',
      },
    );
  }

  // ============================================================
  // ADMINISTRATOR PASSWORD RESET
  // ============================================================

  async resetPassword(
    id: string,
    temporaryPassword: string,
    actorId: string,
  ) {
    if (actorId === id) {
      throw new ForbiddenException(
        'Use the change-password endpoint to update your own password',
      );
    }

    if (
      temporaryPassword.length < 12 ||
      temporaryPassword.length > 128
    ) {
      throw new ConflictException(
        'Temporary password must contain 12 to 128 characters',
      );
    }

    const passwordHash = await argon2.hash(
      temporaryPassword,
    );

    return this.prisma.$transaction(
      async (tx) => {
        const existing = await tx.user.findFirst({
          where: {
            id,
            deletedAt: null,
          },
        });

        if (!existing) {
          throw new NotFoundException('User not found');
        }

        const now = new Date();

        await tx.user.update({
          where: {
            id,
          },
          data: {
            passwordHash,
            mustChangePassword: true,
            passwordChangedAt: now,
            failedLoginAttempts: 0,
            lockedUntil: null,
          },
        });

        await this.revokeUserSessions(
          tx,
          id,
          now,
        );

        await tx.auditLog.create({
          data: {
            userId: actorId,
            action: 'PASSWORD_CHANGED',
            module: 'USERS',
            entityType: 'User',
            entityId: id,
            description:
              'Administrator reset user password',
          },
        });

        return {
          success: true,
          message:
            'Password reset successfully. User must change password at next login.',
        };
      },
      {
        isolationLevel: 'Serializable',
      },
    );
  }

  // ============================================================
  // AUTHENTICATION LOOKUP
  // ============================================================

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: {
        username:
          username.trim().toLowerCase(),
      },

      include: {
        roles: {
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
        },

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
  }
}
