import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  PrismaService,
} from '../../database/prisma/prisma.service.js';

import {
  CreateProductDto,
} from './dto/create-product.dto.js';

import {
  UpdateProductDto,
} from './dto/update-product.dto.js';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateProductDto,
  ) {
    const code =
      dto.code
        .trim()
        .toUpperCase();

    const existing =
      await this.prisma.product.findUnique({
        where: {
          code,
        },
      });

    if (existing) {
      throw new ConflictException(
        'Product code already exists',
      );
    }

    return this.prisma.product.create({
      data: {
        code,

        name:
          dto.name.trim(),

        category:
          dto.category
            ?.trim()
            .toUpperCase(),

        description:
          dto.description?.trim(),

        displayOrder:
          dto.displayOrder ?? 0,
      },
    });
  }

  async findAll(
    includeInactive = false,
  ) {
    return this.prisma.product.findMany({
      where: {
        deletedAt: null,

        ...(includeInactive
          ? {}
          : {
              status: 'ACTIVE',
            }),
      },

      orderBy: [
        {
          displayOrder: 'asc',
        },

        {
          name: 'asc',
        },
      ],
    });
  }

  async findOne(
    id: string,
  ) {
    const product =
      await this.prisma.product.findFirst({
        where: {
          id,
          deletedAt: null,
        },

        include: {
          _count: {
            select: {
              activityProducts: true,
              targetAssignments: true,
              followUps: true,
            },
          },
        },
      });

    if (!product) {
      throw new NotFoundException(
        'Product not found',
      );
    }

    return product;
  }

  async update(
    id: string,
    dto: UpdateProductDto,
  ) {
    await this.findOne(id);

    return this.prisma.product.update({
      where: {
        id,
      },

      data: {
        name:
          dto.name?.trim(),

        category:
          dto.category
            ?.trim()
            .toUpperCase(),

        description:
          dto.description?.trim(),

        displayOrder:
          dto.displayOrder,

        status:
          dto.status,
      },
    });
  }

  async remove(
    id: string,
  ) {
    await this.findOne(id);

    const usage =
      await this.prisma.product.findUnique({
        where: {
          id,
        },

        select: {
          _count: {
            select: {
              activityProducts: true,
              targetAssignments: true,
              followUps: true,
            },
          },
        },
      });

    const used =
      (usage?._count.activityProducts ?? 0) > 0 ||
      (usage?._count.targetAssignments ?? 0) > 0 ||
      (usage?._count.followUps ?? 0) > 0;

    if (used) {
      return this.prisma.product.update({
        where: {
          id,
        },

        data: {
          status: 'INACTIVE',
        },
      });
    }

    return this.prisma.product.update({
      where: {
        id,
      },

      data: {
        status: 'INACTIVE',
        deletedAt: new Date(),
      },
    });
  }
}