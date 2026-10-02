import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  PrismaService,
} from '../../database/prisma/prisma.service.js';

@Injectable()
export class PermissionsService {
  constructor(
    private readonly prisma:
      PrismaService,
  ) {}

  async findAll() {
    return this.prisma.permission.findMany({
      orderBy: [
        {
          module:
            'asc',
        },

        {
          action:
            'asc',
        },
      ],
    });
  }

  async findOne(
    id: string,
  ) {
    const permission =
      await this.prisma.permission.findUnique({
        where: {
          id,
        },
      });

    if (!permission) {
      throw new NotFoundException(
        'Permission not found',
      );
    }

    return permission;
  }

  async findByModule(
    module: string,
  ) {
    return this.prisma.permission.findMany({
      where: {
        module,
      },

      orderBy: {
        action:
          'asc',
      },
    });
  }
}