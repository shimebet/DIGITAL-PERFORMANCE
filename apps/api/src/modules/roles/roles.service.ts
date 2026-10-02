import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  PrismaService,
} from '../../database/prisma/prisma.service.js';

import {
  CreateRoleDto,
} from './dto/create-role.dto.js';

import {
  UpdateRoleDto,
} from './dto/update-role.dto.js';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma:
      PrismaService,
  ) {}

  async create(
    dto: CreateRoleDto,
  ) {
    const code =
      dto.code
        .trim()
        .toUpperCase();

    const existing =
      await this.prisma.role.findUnique({
        where: {
          code,
        },
      });

    if (existing) {
      throw new ConflictException(
        'Role code already exists',
      );
    }

    return this.prisma.role.create({
      data: {
        code,
        name:
          dto.name.trim(),

        description:
          dto.description?.trim(),

        isSystemRole:
          dto.isSystemRole ?? false,
      },
    });
  }

  async findAll() {
    return this.prisma.role.findMany({
      include: {
        _count: {
          select: {
            userRoles:
              true,

            rolePermissions:
              true,
          },
        },
      },

      orderBy: {
        name:
          'asc',
      },
    });
  }

  async findOne(
    id: string,
  ) {
    const role =
      await this.prisma.role.findUnique({
        where: {
          id,
        },

        include: {
          rolePermissions: {
            include: {
              permission:
                true,
            },
          },

          userRoles: {
            include: {
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
          },
        },
      });

    if (!role) {
      throw new NotFoundException(
        'Role not found',
      );
    }

    return role;
  }

  async update(
    id: string,
    dto: UpdateRoleDto,
  ) {
    const role =
      await this.findOne(id);

    if (
      role.isSystemRole &&
      dto.status ===
        'ARCHIVED'
    ) {
      throw new ConflictException(
        'System roles cannot be archived',
      );
    }

    return this.prisma.role.update({
      where: {
        id,
      },

      data: {
        name:
          dto.name?.trim(),

        description:
          dto.description?.trim(),

        status:
          dto.status,
      },
    });
  }
}