import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import {
  ConfigService,
} from '@nestjs/config';

import {
  PassportStrategy,
} from '@nestjs/passport';

import {
  ExtractJwt,
  Strategy,
} from 'passport-jwt';

import {
  PrismaService,
} from '../../../database/prisma/prisma.service.js';

import type {
  AuthenticatedUser,
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
    configService:
      ConfigService,

    private readonly prisma:
      PrismaService,
  ) {
    super({
      jwtFromRequest:
        ExtractJwt.fromAuthHeaderAsBearerToken(),

      ignoreExpiration:
        false,

      secretOrKey:
        configService.getOrThrow<string>(
          'JWT_ACCESS_SECRET',
        ),
    });
  }

  async validate(
    payload: JwtPayload,
  ): Promise<AuthenticatedUser> {
    const user =
      await this.prisma.user.findFirst({
        where: {
          id:
            payload.sub,

          status:
            'ACTIVE',

          deletedAt:
            null,
        },

        include: {
          roles: {
            include: {
              role:
                true,
            },
          },
        },
      });

    if (!user) {
      throw new UnauthorizedException(
        'User account not found or inactive',
      );
    }

    const roleCodes =
      user.roles.map(
        (item) =>
          item.role.code,
      );

    const scopes =
      user.roles.map(
        (item) => ({
          scopeType:
            item.scopeType,

          regionId:
            item.regionId,

          districtId:
            item.districtId,

          branchId:
            item.branchId,
        }),
      );

    /*
     * If permissions are already derived elsewhere in your
     * authentication service, use that logic here.
     *
     * For now this assumes Role has a permissions relation.
     */

    const authenticatedUser:
      AuthenticatedUser = {
        id:
          user.id,

        username:
          user.username,

        firstName:
          user.firstName,

        lastName:
          user.lastName,

        roles:
          roleCodes,

        permissions:
          [],

        scopes,
      };

    return authenticatedUser;
  }
}