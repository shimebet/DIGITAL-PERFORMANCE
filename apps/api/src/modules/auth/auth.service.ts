import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ConfigService,
} from '@nestjs/config';
import {
  JwtService,
} from '@nestjs/jwt';
import argon2 from 'argon2';
import {
  randomUUID,
} from 'node:crypto';
import {
  PrismaService,
} from '../../database/prisma/prisma.service.js';
import {
  UsersService,
} from '../users/users.service.js';
import {
  UpdateMyProfileDto,
} from './dto/update-my-profile.dto.js';
// ============================================================================
// REFRESH TOKEN PAYLOAD
// ============================================================================
interface RefreshTokenPayload {
  sub: string;
  type: 'refresh';
  jti: string;
  iat?: number;
  exp?: number;
}
// ============================================================================
// AUTH SERVICE
// ============================================================================
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService:
      UsersService,
    private readonly prisma:
      PrismaService,
    private readonly jwtService:
      JwtService,
    private readonly configService:
      ConfigService,
  ) {}
  // ==========================================================================
  // LOGIN
  // ==========================================================================
  async login(
    username: string,
    password: string,
  ) {
    const user =
      await this.usersService.findByUsername(
        username,
      );
    if (!user) {
      throw new UnauthorizedException(
        'Invalid username or password',
      );
    }
    if (
      user.status !==
      'ACTIVE'
    ) {
      throw new UnauthorizedException(
        'User account is not active',
      );
    }
    if (
      user.lockedUntil &&
      user.lockedUntil >
        new Date()
    ) {
      throw new UnauthorizedException(
        'User account is temporarily locked',
      );
    }
    const passwordValid =
      await argon2.verify(
        user.passwordHash,
        password,
      );
    if (!passwordValid) {
      await this.handleFailedLogin(
        user.id,
      );
      throw new UnauthorizedException(
        'Invalid username or password',
      );
    }
    await this.prisma.user.update({
      where: {
        id:
          user.id,
      },
      data: {
        failedLoginAttempts:
          0,
        lockedUntil:
          null,
        lastLoginAt:
          new Date(),
      },
    });
    return this.createTokens(
      user,
    );
  }
  // ==========================================================================
  // FAILED LOGIN PROTECTION
  // ==========================================================================
  private async handleFailedLogin(
    userId: string,
  ) {
    const user =
      await this.prisma.user.findUniqueOrThrow({
        where: {
          id:
            userId,
        },
      });
    const attempts =
      user.failedLoginAttempts +
      1;
    await this.prisma.user.update({
      where: {
        id:
          userId,
      },
      data: {
        failedLoginAttempts:
          attempts,
        ...(attempts >=
        5
          ? {
              lockedUntil:
                new Date(
                  Date.now() +
                    15 *
                      60 *
                      1000,
                ),
            }
          : {}),
      },
    });
  }
  // ==========================================================================
  // BUILD AUTHORIZATION CONTEXT
  // ==========================================================================
  private buildAuthorizationContext(
    user: NonNullable<Awaited<ReturnType<UsersService['findByUsername']>>>,
  ) {
    const activeAssignments = user.roles.filter(
      (entry) => entry.role.status === 'ACTIVE',
    );
    const roleAssignments = activeAssignments.map((entry) => ({
      roleCode: entry.role.code,
      scopeType: entry.scopeType,
      regionId: entry.regionId,
      districtId: entry.districtId,
      branchId: entry.branchId,
    }));
    const roles = [...new Set(roleAssignments.map((entry) => entry.roleCode))];
    const permissions = [
      ...new Set(
        activeAssignments.flatMap((entry) =>
          entry.role.rolePermissions
            .filter((item) => item.permission.status === 'ACTIVE')
            .map((item) => item.permission.code),
        ),
      ),
    ];
    const scopes = roleAssignments.map(({ scopeType, regionId, districtId, branchId }) => ({
      scopeType,
      regionId,
      districtId,
      branchId,
    }));
    return { roles, permissions, scopes, roleAssignments };
  }
  // ==========================================================================
  // CREATE ACCESS + REFRESH TOKENS
  // ==========================================================================
  private async createTokens(
    user: Awaited<
      ReturnType<
        UsersService[
          'findByUsername'
        ]
      >
    >,
  ) {
    if (!user) {
      throw new UnauthorizedException();
    }
const {
  roles,
  permissions,
  scopes,
  roleAssignments,
} = this.buildAuthorizationContext(user);
    const accessPayload = {
      sub:
        user.id,
      username:
        user.username,
      roles,
      permissions,
      scopes,
    };
    const accessSecret =
      this.configService.getOrThrow<string>(
        'JWT_ACCESS_SECRET',
      );
    const refreshSecret =
      this.configService.getOrThrow<string>(
        'JWT_REFRESH_SECRET',
      );
    // ------------------------------------------------------------------------
    // ACCESS TOKEN
    // ------------------------------------------------------------------------
    const accessToken =
      await this.jwtService.signAsync(
        accessPayload,
        {
          secret:
            accessSecret,
          expiresIn:
            '15m',
        },
      );
    // ------------------------------------------------------------------------
    // REFRESH TOKEN
    //
    // RefreshToken.id is also used as the JWT jti.
    // ------------------------------------------------------------------------
    const refreshTokenId =
      randomUUID();
    const refreshToken =
      await this.jwtService.signAsync(
        {
          sub:
            user.id,
          type:
            'refresh',
          jti:
            refreshTokenId,
        },
        {
          secret:
            refreshSecret,
          expiresIn:
            '7d',
        },
      );
    const tokenHash =
      await argon2.hash(
        refreshToken,
      );
    await this.prisma.refreshToken.create({
      data: {
        id:
          refreshTokenId,
        userId:
          user.id,
        tokenHash,
        expiresAt:
          new Date(
            Date.now() +
              7 *
                24 *
                60 *
                60 *
                1000,
          ),
      },
    });
    return {
      accessToken,
      refreshToken,
      user: {
        id:
          user.id,
        username:
          user.username,
        email:
          user.email,
        phone:
          user.phone,
        firstName:
          user.firstName,
        middleName:
          user.middleName,
        lastName:
          user.lastName,
        mustChangePassword:
          user.mustChangePassword,
        roles,
        permissions,
        scopes,
        roleAssignments,
      },
    };
  }
  // ==========================================================================
  // CREATE ROTATED TOKEN PAIR
  // ==========================================================================
  private async createRotatedTokens(
    user: NonNullable<
      Awaited<
        ReturnType<
          UsersService[
            'findByUsername'
          ]
        >
      >
    >,
    oldRefreshTokenId:
      string,
  ) {
const {
  roles,
  permissions,
  scopes,
  roleAssignments,
} = this.buildAuthorizationContext(user);
    const accessSecret =
      this.configService.getOrThrow<string>(
        'JWT_ACCESS_SECRET',
      );
    const refreshSecret =
      this.configService.getOrThrow<string>(
        'JWT_REFRESH_SECRET',
      );
    // ------------------------------------------------------------------------
    // NEW ACCESS TOKEN
    // ------------------------------------------------------------------------
    const accessToken =
      await this.jwtService.signAsync(
        {
          sub:
            user.id,
          username:
            user.username,
          roles,
          permissions,
          scopes,
        },
        {
          secret:
            accessSecret,
          expiresIn:
            '15m',
        },
      );
    // ------------------------------------------------------------------------
    // NEW REFRESH TOKEN
    // ------------------------------------------------------------------------
    const newRefreshTokenId =
      randomUUID();
    const refreshToken =
      await this.jwtService.signAsync(
        {
          sub:
            user.id,
          type:
            'refresh',
          jti:
            newRefreshTokenId,
        },
        {
          secret:
            refreshSecret,
          expiresIn:
            '7d',
        },
      );
    const tokenHash =
      await argon2.hash(
        refreshToken,
      );
    // ------------------------------------------------------------------------
    // ATOMIC REFRESH TOKEN ROTATION
    // ------------------------------------------------------------------------
    await this.prisma.$transaction(
      async (
        tx,
      ) => {
        const revoked =
          await tx.refreshToken.updateMany({
            where: {
              id:
                oldRefreshTokenId,
              userId:
                user.id,
              revokedAt:
                null,
              expiresAt: {
                gt:
                  new Date(),
              },
            },
            data: {
              revokedAt:
                new Date(),
              replacedByTokenId:
                newRefreshTokenId,
            },
          });
        if (
          revoked.count !==
          1
        ) {
          throw new UnauthorizedException(
            'Refresh token has already been used or revoked',
          );
        }
        await tx.refreshToken.create({
          data: {
            id:
              newRefreshTokenId,
            userId:
              user.id,
            tokenHash,
            expiresAt:
              new Date(
                Date.now() +
                  7 *
                    24 *
                    60 *
                    60 *
                    1000,
              ),
          },
        });
      },
    );
    return {
      accessToken,
      refreshToken,
      user: {
        id:
          user.id,
        username:
          user.username,
        email:
          user.email,
        phone:
          user.phone,
        firstName:
          user.firstName,
        middleName:
          user.middleName,
        lastName:
          user.lastName,
        mustChangePassword:
          user.mustChangePassword,
        roles,
        permissions,
        scopes,
        roleAssignments,
      },
    };
  }
  // ==========================================================================
  // REFRESH
  // ==========================================================================
  async refresh(
    refreshToken: string,
  ) {
    const refreshSecret =
      this.configService.getOrThrow<string>(
        'JWT_REFRESH_SECRET',
      );
    let payload:
      RefreshTokenPayload;
    // ------------------------------------------------------------------------
    // VERIFY JWT
    // ------------------------------------------------------------------------
    try {
      payload =
        await this.jwtService.verifyAsync<
          RefreshTokenPayload
        >(
          refreshToken,
          {
            secret:
              refreshSecret,
          },
        );
    } catch {
      throw new UnauthorizedException(
        'Invalid refresh token',
      );
    }
    // ------------------------------------------------------------------------
    // VALIDATE TOKEN TYPE
    // ------------------------------------------------------------------------
    if (
      payload.type !==
      'refresh'
    ) {
      throw new UnauthorizedException(
        'Invalid token type',
      );
    }
    if (
      !payload.sub ||
      !payload.jti
    ) {
      throw new UnauthorizedException(
        'Invalid refresh token',
      );
    }
    // ------------------------------------------------------------------------
    // EXACT TOKEN LOOKUP
    // ------------------------------------------------------------------------
    const storedToken =
      await this.prisma.refreshToken.findUnique({
        where: {
          id:
            payload.jti,
        },
      });
    if (!storedToken) {
      throw new UnauthorizedException(
        'Refresh token is no longer valid',
      );
    }
    // ------------------------------------------------------------------------
    // VERIFY OWNER
    // ------------------------------------------------------------------------
    if (
      storedToken.userId !==
      payload.sub
    ) {
      throw new UnauthorizedException(
        'Refresh token owner mismatch',
      );
    }
    // ------------------------------------------------------------------------
    // TOKEN REUSE DETECTION
    // ------------------------------------------------------------------------
    if (
      storedToken.revokedAt
    ) {
      if (
        storedToken.replacedByTokenId
      ) {
        await this.prisma.refreshToken.updateMany({
          where: {
            userId:
              storedToken.userId,
            revokedAt:
              null,
          },
          data: {
            revokedAt:
              new Date(),
          },
        });
        throw new UnauthorizedException(
          'Refresh token reuse detected. Please login again.',
        );
      }
      throw new UnauthorizedException(
        'Refresh token has been revoked',
      );
    }
    // ------------------------------------------------------------------------
    // DATABASE EXPIRATION CHECK
    // ------------------------------------------------------------------------
    if (
      storedToken.expiresAt <=
      new Date()
    ) {
      throw new UnauthorizedException(
        'Refresh token has expired',
      );
    }
    // ------------------------------------------------------------------------
    // VERIFY ARGON2 HASH
    // ------------------------------------------------------------------------
    const tokenMatches =
      await argon2.verify(
        storedToken.tokenHash,
        refreshToken,
      );
    if (!tokenMatches) {
      await this.prisma.refreshToken.updateMany({
        where: {
          userId:
            storedToken.userId,
          revokedAt:
            null,
        },
        data: {
          revokedAt:
            new Date(),
        },
      });
      throw new UnauthorizedException(
        'Refresh token validation failed',
      );
    }
    // ------------------------------------------------------------------------
    // LOAD ACTIVE USER
    // ------------------------------------------------------------------------
    const userRecord =
      await this.prisma.user.findUnique({
        where: {
          id:
            payload.sub,
        },
        select: {
          username:
            true,
          status:
            true,
          deletedAt:
            true,
        },
      });
    if (
      !userRecord ||
      userRecord.status !==
        'ACTIVE' ||
      userRecord.deletedAt
    ) {
      await this.prisma.refreshToken.updateMany({
        where: {
          userId:
            payload.sub,
          revokedAt:
            null,
        },
        data: {
          revokedAt:
            new Date(),
        },
      });
      throw new UnauthorizedException(
        'User account is not active',
      );
    }
    const user =
      await this.usersService.findByUsername(
        userRecord.username,
      );
    if (
      !user ||
      user.status !==
        'ACTIVE'
    ) {
      throw new UnauthorizedException(
        'User account is not active',
      );
    }
    // ------------------------------------------------------------------------
    // ATOMIC ROTATION
    // ------------------------------------------------------------------------
    return this.createRotatedTokens(
      user,
      storedToken.id,
    );
  }
  // ==========================================================================
  // LOGOUT
  // ==========================================================================
  async logout(
    userId: string,
  ) {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt:
          null,
      },
      data: {
        revokedAt:
          new Date(),
      },
    });
    return {
      success:
        true,
      message:
        'Logged out successfully',
    };
  }
  // ==========================================================================
  // CHANGE PASSWORD
  // ==========================================================================
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user =
      await this.prisma.user.findUnique({
        where: {
          id:
            userId,
        },
      });
    if (!user) {
      throw new UnauthorizedException(
        'User not found',
      );
    }
    // ------------------------------------------------------------------------
    // VERIFY CURRENT PASSWORD
    // ------------------------------------------------------------------------
    const valid =
      await argon2.verify(
        user.passwordHash,
        currentPassword,
      );
    if (!valid) {
      throw new BadRequestException(
        'Current password is incorrect',
      );
    }
    // ------------------------------------------------------------------------
    // PREVENT PASSWORD REUSE
    // ------------------------------------------------------------------------
    const samePassword =
      await argon2.verify(
        user.passwordHash,
        newPassword,
      );
    if (samePassword) {
      throw new BadRequestException(
        'New password must be different from the current password',
      );
    }
    // ------------------------------------------------------------------------
    // HASH NEW PASSWORD
    // ------------------------------------------------------------------------
    const passwordHash =
      await argon2.hash(
        newPassword,
      );
    const now =
      new Date();
    // ------------------------------------------------------------------------
    // UPDATE PASSWORD + REVOKE TOKENS ATOMICALLY
    // ------------------------------------------------------------------------
    await this.prisma.$transaction(
      async (
        tx,
      ) => {
        await tx.user.update({
          where: {
            id:
              userId,
          },
          data: {
            passwordHash,
            passwordChangedAt:
              now,
            mustChangePassword:
              false,
            failedLoginAttempts:
              0,
            lockedUntil:
              null,
          },
        });
        await tx.refreshToken.updateMany({
          where: {
            userId,
            revokedAt:
              null,
          },
          data: {
            revokedAt:
              now,
          },
        });
      },
    );
    return {
      success:
        true,
      message:
        'Password changed successfully. Please login again.',
    };
  }
  // ==========================================================================
  // BUILD CURRENT USER PROFILE
  // ==========================================================================
    private async getAuthUser(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        roles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
            region: true,
            district: { include: { region: true } },
            branch: { include: { district: { include: { region: true } } } },
          },
        },
        staffProfile: {
          include: {
            branch: { include: { district: { include: { region: true } } } },
          },
        },
      },
    });
    if (!user) {
      throw new UnauthorizedException('User account not found');
    }
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is not active');
    }
    const activeAssignments = user.roles.filter(
      (assignment) => assignment.role.status === 'ACTIVE',
    );
    const roleAssignments = activeAssignments.map((assignment) => ({
      roleCode: assignment.role.code,
      scopeType: assignment.scopeType,
      regionId: assignment.regionId,
      districtId: assignment.districtId,
      branchId: assignment.branchId,
    }));
    const roles = [...new Set(roleAssignments.map((assignment) => assignment.roleCode))];
    const permissions = [
      ...new Set(
        activeAssignments.flatMap((assignment) =>
          assignment.role.rolePermissions
            .filter((entry) => entry.permission.status === 'ACTIVE')
            .map((entry) => entry.permission.code),
        ),
      ),
    ];
    const scopes = activeAssignments.map((assignment) => {
      const branch = assignment.branch;
      const district = assignment.district ?? branch?.district ?? null;
      const region = assignment.region ?? district?.region ?? branch?.district?.region ?? null;
      return {
        scopeType: assignment.scopeType,
        regionId: assignment.regionId ?? region?.id ?? null,
        regionName: region?.name ?? null,
        districtId: assignment.districtId ?? district?.id ?? null,
        districtName: district?.name ?? null,
        branchId: assignment.branchId ?? branch?.id ?? null,
        branchName: branch?.name ?? null,
      };
    });
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      middleName: user.middleName,
      lastName: user.lastName,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
      employeeNumber: user.staffProfile?.employeeNumber ?? null,
      jobTitle: user.staffProfile?.jobTitle ?? null,
      roles,
      permissions,
      scopes,
      roleAssignments,
    };
  }
  // ==========================================================================
  // CURRENT USER
  // ==========================================================================
  async me(
    userId: string,
  ) {
    return this.getAuthUser(
      userId,
    );
  }
  // ==========================================================================
  // UPDATE MY PROFILE
  // ==========================================================================
  async updateMyProfile(
    userId: string,
    dto: UpdateMyProfileDto,
  ) {
    const existingUser =
      await this.prisma.user.findFirst({
        where: {
          id:
            userId,
          deletedAt:
            null,
        },
        select: {
          id:
            true,
          status:
            true,
          email:
            true,
        },
      });
    if (!existingUser) {
      throw new UnauthorizedException(
        'User account not found',
      );
    }
    if (
      existingUser.status !==
      'ACTIVE'
    ) {
      throw new UnauthorizedException(
        'User account is not active',
      );
    }
    // ------------------------------------------------------------------------
    // CHECK EMAIL UNIQUENESS
    // ------------------------------------------------------------------------
    if (
      dto.email !==
        undefined &&
      dto.email !==
        null
    ) {
      const normalizedEmail =
        dto.email.toLowerCase();
      const emailOwner =
        await this.prisma.user.findFirst({
          where: {
            email:
              normalizedEmail,
            id: {
              not:
                userId,
            },
            deletedAt:
              null,
          },
          select: {
            id:
              true,
          },
        });
      if (emailOwner) {
        throw new ConflictException(
          'Email address is already in use',
        );
      }
    }
    // ------------------------------------------------------------------------
    // UPDATE ALLOWED SELF-SERVICE FIELDS ONLY
    //
    // The user cannot update:
    // - username
    // - status
    // - roles
    // - permissions
    // - region
    // - district
    // - branch
    // - employee number
    // - password here
    // ------------------------------------------------------------------------
    await this.prisma.user.update({
      where: {
        id:
          userId,
      },
      data: {
        ...(dto.firstName !==
        undefined
          ? {
              firstName:
                dto.firstName,
            }
          : {}),
        ...(dto.middleName !==
        undefined
          ? {
              middleName:
                dto.middleName,
            }
          : {}),
        ...(dto.lastName !==
        undefined
          ? {
              lastName:
                dto.lastName,
            }
          : {}),
        ...(dto.email !==
        undefined
          ? {
              email:
                dto.email
                  ? dto.email.toLowerCase()
                  : null,
            }
          : {}),
        ...(dto.phone !==
        undefined
          ? {
              phone:
                dto.phone,
            }
          : {}),
      },
    });
    // ------------------------------------------------------------------------
    // RETURN FRESH PROFILE INCLUDING ROLES / PERMISSIONS / SCOPE NAMES
    // ------------------------------------------------------------------------
    return this.getAuthUser(
      userId,
    );
  }
}