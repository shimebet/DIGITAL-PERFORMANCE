import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';

import {
  ConfigService,
} from '@nestjs/config';

import {
  JwtService,
} from '@nestjs/jwt';

import argon2 from 'argon2';

import {
  PrismaService,
} from '../../database/prisma/prisma.service.js';

import {
  UsersService,
} from '../users/users.service.js';

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
      user.status !== 'ACTIVE'
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
        id: user.id,
      },

      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt:
          new Date(),
      },
    });

    return this.createTokens(
      user,
    );
  }

  private async handleFailedLogin(
    userId: string,
  ) {
    const user =
      await this.prisma.user.findUniqueOrThrow({
        where: {
          id: userId,
        },
      });

    const attempts =
      user.failedLoginAttempts +
      1;

    await this.prisma.user.update({
      where: {
        id: userId,
      },

      data: {
        failedLoginAttempts:
          attempts,

        ...(attempts >= 5
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

    const roles =
      user.roles.map(
        (entry) =>
          entry.role.code,
      );

    const permissions = [
      ...new Set(
        user.roles.flatMap(
          (entry) =>
            entry.role.rolePermissions.map(
              (rp) =>
                rp.permission.code,
            ),
        ),
      ),
    ];

    const scopes =
      user.roles.map(
        (entry) => ({
          scopeType:
            entry.scopeType,

          regionId:
            entry.regionId,

          districtId:
            entry.districtId,

          branchId:
            entry.branchId,
        }),
      );

    const payload = {
      sub: user.id,
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

    const accessToken =
      await this.jwtService.signAsync(
        payload,
        {
          secret:
            accessSecret,
          expiresIn:
            '15m',
        },
      );

    const refreshToken =
      await this.jwtService.signAsync(
        {
          sub:
            user.id,

          type:
            'refresh',
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

        firstName:
          user.firstName,

        lastName:
          user.lastName,

        mustChangePassword:
          user.mustChangePassword,

        roles,

        permissions,

        scopes,
      },
    };
  }

  async refresh(
    refreshToken: string,
  ) {
    const refreshSecret =
      this.configService.getOrThrow<string>(
        'JWT_REFRESH_SECRET',
      );

    let payload: {
      sub: string;
      type?: string;
    };

    try {
      payload =
        await this.jwtService.verifyAsync(
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

    if (
      payload.type !==
      'refresh'
    ) {
      throw new UnauthorizedException(
        'Invalid token type',
      );
    }

    const tokens =
      await this.prisma.refreshToken.findMany({
        where: {
          userId:
            payload.sub,

          revokedAt:
            null,

          expiresAt: {
            gt:
              new Date(),
          },
        },

        orderBy: {
          createdAt:
            'desc',
        },

        take:
          10,
      });

    let matchedToken:
      | (typeof tokens)[number]
      | undefined;

    for (
      const storedToken
      of tokens
    ) {
      const matches =
        await argon2.verify(
          storedToken.tokenHash,
          refreshToken,
        );

      if (matches) {
        matchedToken =
          storedToken;
        break;
      }
    }

    if (!matchedToken) {
      throw new UnauthorizedException(
        'Refresh token is no longer valid',
      );
    }

    await this.prisma.refreshToken.update({
      where: {
        id:
          matchedToken.id,
      },

      data: {
        revokedAt:
          new Date(),
      },
    });

    const user =
      await this.usersService.findByUsername(
        (
          await this.prisma.user.findUniqueOrThrow({
            where: {
              id:
                payload.sub,
            },

            select: {
              username:
                true,
            },
          })
        ).username,
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

    return this.createTokens(
      user,
    );
  }

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
      success: true,
      message:
        'Logged out successfully',
    };
  }

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

    const passwordHash =
      await argon2.hash(
        newPassword,
      );

    await this.prisma.user.update({
      where: {
        id:
          userId,
      },

      data: {
        passwordHash,

        passwordChangedAt:
          new Date(),

        mustChangePassword:
          false,

        failedLoginAttempts:
          0,

        lockedUntil:
          null,
      },
    });

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
      success: true,
      message:
        'Password changed successfully. Please login again.',
    };
  }

  async me(
    userId: string,
  ) {
    return this.usersService.findOne(
      userId,
    );
  }
}