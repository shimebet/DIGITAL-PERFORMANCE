import { isRoleAssignmentCurrentlyValid } from '../utils/role-assignment-validity.js';

import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import { PassportStrategy } from '@nestjs/passport';

import {
  ExtractJwt,
  Strategy,
} from 'passport-jwt';

import { PrismaService } from '../../../database/prisma/prisma.service.js';

import type {
  AuthenticatedUser,
  AuthenticatedUserRoleAssignment,
} from '../interfaces/authenticated-user.interface.js';

interface JwtPayload {
  sub: string;
  username: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(
  Strategy,
  'jwt',
) {
  constructor(
    configService: ConfigService,

    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest:
        ExtractJwt.fromAuthHeaderAsBearerToken(),

      ignoreExpiration: false,

      secretOrKey:
        configService.getOrThrow<string>(
          'JWT_ACCESS_SECRET',
        ),
    });
  }

  async validate(
    payload: JwtPayload,
  ): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: payload.sub,
        status: 'ACTIVE',
        deletedAt: null,
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
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        'User account not found or inactive',
      );
    }

    const activeAssignments = user.roles.filter(
      (item) => (item.role.status === 'ACTIVE' && isRoleAssignmentCurrentlyValid(item)),
    );

    const roleAssignments:
      AuthenticatedUserRoleAssignment[] =
      activeAssignments.map((item) => ({
        roleCode: item.role.code,

        scopeType: item.scopeType,

        regionId: item.regionId,

        districtId: item.districtId,

        branchId: item.branchId,

        permissions: item.role.rolePermissions
          .filter((rp) => rp.permission.status === 'ACTIVE')
          .map((rp) => rp.permission.code),
      }));

    const roles = [
      ...new Set(
        roleAssignments.map(
          (assignment) => assignment.roleCode,
        ),
      ),
    ];

    const permissions = [
      ...new Set(
        activeAssignments.flatMap((item) =>
          item.role.rolePermissions
            .filter(
              (rolePermission) =>
                rolePermission.permission.status ===
                'ACTIVE',
            )
            .map(
              (rolePermission) =>
                rolePermission.permission.code,
            ),
        ),
      ),
    ];

    const scopes = roleAssignments.map(
      ({
        scopeType,
        regionId,
        districtId,
        branchId,
      }) => ({
        scopeType,
        regionId,
        districtId,
        branchId,
      }),
    );

 const authenticatedUser: AuthenticatedUser = {
  id: user.id,

  username: user.username,

  firstName: user.firstName,

  lastName: user.lastName,

  mustChangePassword: user.mustChangePassword,

  roles,

  permissions,

  scopes,

  roleAssignments,
};

    return authenticatedUser;
  }
}


