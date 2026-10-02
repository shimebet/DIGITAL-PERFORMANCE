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
  CreateDistrictDto,
} from './dto/create-district.dto.js';

import {
  UpdateDistrictDto,
} from './dto/update-district.dto.js';

@Injectable()
export class DistrictsService {
  constructor(
    private readonly prisma:
      PrismaService,

    private readonly scopeService:
      ScopeService,
  ) {}

  // ==========================================================================
  // BASIC CREATE
  // ==========================================================================

  async create(
    dto: CreateDistrictDto,
  ) {
    const region =
      await this.prisma.region.findFirst({
        where: {
          id:
            dto.regionId,

          deletedAt:
            null,
        },
      });

    if (!region) {
      throw new NotFoundException(
        'Region not found',
      );
    }

    const code =
      dto.code
        .trim()
        .toUpperCase();

    const existing =
      await this.prisma.district.findUnique({
        where: {
          code,
        },
      });

    if (existing) {
      throw new ConflictException(
        'District code already exists',
      );
    }

    return this.prisma.district.create({
      data: {
        regionId:
          dto.regionId,

        code,

        name:
          dto.name.trim(),

        description:
          dto.description?.trim(),
      },

      include: {
        region:
          true,
      },
    });
  }

  // ==========================================================================
  // SCOPED CREATE
  // ==========================================================================

  async createScoped(
    dto: CreateDistrictDto,
    user: AuthenticatedUser,
  ) {
    await this.scopeService.assertRegionAccess(
      user,
      dto.regionId,
    );

    return this.create(
      dto,
    );
  }

  // ==========================================================================
  // BASIC FIND ALL
  // ==========================================================================

  async findAll(
    regionId?: string,
  ) {
    return this.prisma.district.findMany({
      where: {
        deletedAt:
          null,

        ...(regionId
          ? {
              regionId,
            }
          : {}),
      },

      include: {
        region:
          true,

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
    });
  }

  // ==========================================================================
  // SCOPED FIND ALL
  // ==========================================================================

  async findAllScoped(
    user: AuthenticatedUser,
    regionId?: string,
  ) {
    if (
      this.scopeService.isGlobal(
        user,
      )
    ) {
      return this.findAll(
        regionId,
      );
    }

    if (regionId) {
      const allowed =
        await this.scopeService.canAccessRegion(
          user,
          regionId,
        );

      /*
       * Users with DISTRICT or BRANCH scope may legitimately request
       * the parent region. Therefore do not reject immediately solely
       * because they lack direct REGION scope.
       */
      if (!allowed) {
        const districtIds =
          this.scopeService.getDistrictIds(
            user,
          );

        const branchIds =
          this.scopeService.getBranchIds(
            user,
          );

        const belongsToRegion =
          await this.prisma.region.findFirst({
            where: {
              id:
                regionId,

              deletedAt:
                null,

              OR: [
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

            select: {
              id:
                true,
            },
          });

        if (!belongsToRegion) {
          return [];
        }
      }
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

    return this.prisma.district.findMany({
      where: {
        deletedAt:
          null,

        ...(regionId
          ? {
              regionId,
            }
          : {}),

        OR: [
          ...(regionIds.length > 0
            ? [
                {
                  regionId: {
                    in:
                      regionIds,
                  },
                },
              ]
            : []),

          ...(districtIds.length > 0
            ? [
                {
                  id: {
                    in:
                      districtIds,
                  },
                },
              ]
            : []),

          ...(branchIds.length > 0
            ? [
                {
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
              ]
            : []),
        ],
      },

      include: {
        region:
          true,

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
    });
  }

  // ==========================================================================
  // BASIC FIND ONE
  // ==========================================================================

  async findOne(
    id: string,
  ) {
    const district =
      await this.prisma.district.findFirst({
        where: {
          id,

          deletedAt:
            null,
        },

        include: {
          region:
            true,

          branches: {
            where: {
              deletedAt:
                null,
            },

            orderBy: {
              name:
                'asc',
            },
          },
        },
      });

    if (!district) {
      throw new NotFoundException(
        'District not found',
      );
    }

    return district;
  }

  // ==========================================================================
  // SCOPED FIND ONE
  // ==========================================================================

  async findOneScoped(
    id: string,
    user: AuthenticatedUser,
  ) {
    await this.scopeService.assertDistrictAccess(
      user,
      id,
    );

    return this.findOne(
      id,
    );
  }

  // ==========================================================================
  // BASIC UPDATE
  // ==========================================================================

  async update(
    id: string,
    dto: UpdateDistrictDto,
  ) {
    await this.findOne(
      id,
    );

    if (dto.regionId) {
      const region =
        await this.prisma.region.findFirst({
          where: {
            id:
              dto.regionId,

            deletedAt:
              null,
          },
        });

      if (!region) {
        throw new NotFoundException(
          'Region not found',
        );
      }
    }

    if (dto.code) {
      const code =
        dto.code
          .trim()
          .toUpperCase();

      const duplicate =
        await this.prisma.district.findFirst({
          where: {
            code,

            NOT: {
              id,
            },
          },
        });

      if (duplicate) {
        throw new ConflictException(
          'District code already exists',
        );
      }
    }

    return this.prisma.district.update({
      where: {
        id,
      },

      data: {
        regionId:
          dto.regionId,

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

      include: {
        region:
          true,
      },
    });
  }

  // ==========================================================================
  // SCOPED UPDATE
  // ==========================================================================

  async updateScoped(
    id: string,
    dto: UpdateDistrictDto,
    user: AuthenticatedUser,
  ) {
    await this.scopeService.assertDistrictAccess(
      user,
      id,
    );

    if (dto.regionId) {
      await this.scopeService.assertRegionAccess(
        user,
        dto.regionId,
      );
    }

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
    await this.findOne(
      id,
    );

    const activeBranches =
      await this.prisma.branch.count({
        where: {
          districtId:
            id,

          deletedAt:
            null,
        },
      });

    if (
      activeBranches >
      0
    ) {
      throw new ConflictException(
        'District cannot be deleted while it has active branches',
      );
    }

    return this.prisma.district.update({
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
    await this.scopeService.assertDistrictAccess(
      user,
      id,
    );

    return this.remove(
      id,
    );
  }
}