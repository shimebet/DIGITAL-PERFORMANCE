import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  PrismaService,
} from '../../database/prisma/prisma.service.js';

import {
  ScopeService,
} from '../auth/services/scope.service.js';

import type {
  AuthenticatedUser,
} from '../auth/interfaces/authenticated-user.interface.js';

import {
  CreateRegionDto,
} from './dto/create-region.dto.js';

import {
  UpdateRegionDto,
} from './dto/update-region.dto.js';

@Injectable()
export class RegionsService {
  constructor(
    private readonly prisma: PrismaService,

    private readonly scopeService: ScopeService,
  ) {}

  // ==========================================================================
  // BASIC CREATE
  // ==========================================================================

  async create(
    dto: CreateRegionDto,
  ) {
    const code =
      dto.code
        .trim()
        .toUpperCase();

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

        name:
          dto.name.trim(),

        description:
          dto.description?.trim(),
      },
    });
  }

  // ==========================================================================
  // BASIC FIND ALL
  // ==========================================================================

  async findAll() {
    return this.prisma.region.findMany({
      where: {
        deletedAt: null,
      },

      include: {
        _count: {
          select: {
            districts: true,
          },
        },
      },

      orderBy: {
        name:
          'asc',
      },
    });
  }

  // ==========================================================================
  // SCOPED FIND ALL
  // ==========================================================================

  async findAllScoped(
    user: AuthenticatedUser,
  ) {
    if (
      this.scopeService.isGlobal(
        user,
      )
    ) {
      return this.findAll();
    }

    const regionIds =
      this.scopeService.getRegionIds(
        user,
      );

    const districtIds =
      this.scopeService.getDistrictIds(
        user,
      );

    const branchIds =
      this.scopeService.getBranchIds(
        user,
      );

    if (
      regionIds.length === 0 &&
      districtIds.length === 0 &&
      branchIds.length === 0
    ) {
      return [];
    }

    return this.prisma.region.findMany({
      where: {
        deletedAt: null,

        OR: [
          ...(regionIds.length > 0
            ? [
                {
                  id: {
                    in:
                      regionIds,
                  },
                },
              ]
            : []),

          ...(districtIds.length > 0
            ? [
                {
                  districts: {
                    some: {
                      id: {
                        in:
                          districtIds,
                      },

                      deletedAt:
                        null,
                    },
                  },
                },
              ]
            : []),

          ...(branchIds.length > 0
            ? [
                {
                  districts: {
                    some: {
                      deletedAt:
                        null,

                      branches: {
                        some: {
                          id: {
                            in:
                              branchIds,
                          },

                          deletedAt:
                            null,
                        },
                      },
                    },
                  },
                },
              ]
            : []),
        ],
      },

      include: {
        _count: {
          select: {
            districts: true,
          },
        },
      },

      orderBy: {
        name:
          'asc',
      },
    });
  }

  // ==========================================================================
  // BASIC FIND ONE
  // ==========================================================================

  async findOne(
    id: string,
  ) {
    const region =
      await this.prisma.region.findFirst({
        where: {
          id,

          deletedAt:
            null,
        },

        include: {
          districts: {
            where: {
              deletedAt:
                null,
            },

            include: {
              _count: {
                select: {
                  branches:
                    true,
                },
              },
            },

            orderBy: {
              name:
                'asc',
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

  // ==========================================================================
  // SCOPED FIND ONE
  // ==========================================================================

  async findOneScoped(
    id: string,
    user: AuthenticatedUser,
  ) {
    await this.scopeService.assertRegionAccess(
      user,
      id,
    );

    return this.findOne(id);
  }

  // ==========================================================================
  // BASIC UPDATE
  // ==========================================================================

  async update(
    id: string,
    dto: UpdateRegionDto,
  ) {
    await this.findOne(id);

    if (dto.code) {
      const code =
        dto.code
          .trim()
          .toUpperCase();

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
        code:
          dto.code
            ?.trim()
            .toUpperCase(),

        name:
          dto.name?.trim(),

        description:
          dto.description?.trim(),

        status:
          dto.status,
      },
    });
  }

  // ==========================================================================
  // SCOPED UPDATE
  // ==========================================================================

  async updateScoped(
    id: string,
    dto: UpdateRegionDto,
    user: AuthenticatedUser,
  ) {
    await this.scopeService.assertRegionAccess(
      user,
      id,
    );

    return this.update(
      id,
      dto,
    );
  }

  // ==========================================================================
  // BASIC REMOVE
  // ==========================================================================

  async remove(
    id: string,
  ) {
    await this.findOne(id);

    const activeDistricts =
      await this.prisma.district.count({
        where: {
          regionId:
            id,

          deletedAt:
            null,
        },
      });

    if (
      activeDistricts >
      0
    ) {
      throw new ConflictException(
        'Region cannot be deleted while it has active districts',
      );
    }

    return this.prisma.region.update({
      where: {
        id,
      },

      data: {
        deletedAt:
          new Date(),

        status:
          'INACTIVE',
      },
    });
  }

  // ==========================================================================
  // SCOPED REMOVE
  // ==========================================================================

  async removeScoped(
    id: string,
    user: AuthenticatedUser,
  ) {
    await this.scopeService.assertRegionAccess(
      user,
      id,
    );

    return this.remove(id);
  }
}