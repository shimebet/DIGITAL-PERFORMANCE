import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma/prisma.service.js';
import { CreateRegionDto } from './dto/create-region.dto.js';
import { UpdateRegionDto } from './dto/update-region.dto.js';

@Injectable()
export class RegionsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateRegionDto) {
    const code = dto.code.trim().toUpperCase();

    const existing =
      await this.prisma.region.findUnique({
        where: {
          code,
        },
      });

    if (existing) {
      throw new ConflictException(
        'Region code already exists',
      );
    }

    return this.prisma.region.create({
      data: {
        code,
        name: dto.name.trim(),
        description: dto.description?.trim(),
      },
    });
  }

  async findAll() {
    return this.prisma.region.findMany({
      where: {
        deletedAt: null,
      },

      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const region =
      await this.prisma.region.findFirst({
        where: {
          id,
          deletedAt: null,
        },

        include: {
          districts: {
            where: {
              deletedAt: null,
            },

            orderBy: {
              name: 'asc',
            },
          },
        },
      });

    if (!region) {
      throw new NotFoundException(
        'Region not found',
      );
    }

    return region;
  }

  async update(
    id: string,
    dto: UpdateRegionDto,
  ) {
    await this.findOne(id);

    if (dto.code) {
      const code =
        dto.code.trim().toUpperCase();

      const duplicate =
        await this.prisma.region.findFirst({
          where: {
            code,
            NOT: {
              id,
            },
          },
        });

      if (duplicate) {
        throw new ConflictException(
          'Region code already exists',
        );
      }
    }

    return this.prisma.region.update({
      where: {
        id,
      },

      data: {
        code: dto.code
          ?.trim()
          .toUpperCase(),

        name: dto.name?.trim(),

        description:
          dto.description?.trim(),

        status: dto.status,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.region.update({
      where: {
        id,
      },

      data: {
        deletedAt: new Date(),
        status: 'INACTIVE',
      },
    });
  }
}