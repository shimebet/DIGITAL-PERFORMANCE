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
  CreateBranchDto,
} from './dto/create-branch.dto.js';

import {
  UpdateBranchDto,
} from './dto/update-branch.dto.js';

@Injectable()
export class BranchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
  ) {}

  // ==========================================================================
  // BASIC CREATE
  // ==========================================================================

  async create(
    dto: CreateBranchDto,
  ) {
    const district =
      await this.prisma.district.findFirst({
        where: {
          id: dto.districtId,
          deletedAt: null,
        },

        include: {
          region: true,
        },
      });

    if (!district) {
      throw new NotFoundException(
        'District not found',
      );
    }

    const code =
      dto.code
        .trim()
        .toUpperCase();

    const existing =
      await this.prisma.branch.findUnique({
        where: {
          code,
        },
      });

    if (existing) {
      throw new ConflictException(
        'Branch code already exists',
      );
    }

    return this.prisma.branch.create({
      data: {
        districtId: dto.districtId,
        code,
        name: dto.name.trim(),
        branchType: dto.branchType?.trim(),
        phone: dto.phone?.trim(),
        email: dto.email
          ?.trim()
          .toLowerCase(),
        address: dto.address?.trim(),
        timezone:
          dto.timezone?.trim() ??
          'Africa/Addis_Ababa',
      },

      include: {
        district: {
          include: {
            region: true,
          },
        },
      },
    });
  }

  // ==========================================================================
  // SCOPED CREATE
  // ==========================================================================

  async createScoped(
    dto: CreateBranchDto,
    user: AuthenticatedUser,
  ) {
    await this.scopeService.assertDistrictAccess(
      user,
      dto.districtId,
    );

    return this.create(
      dto,
    );
  }

  // ==========================================================================
  // BASIC FIND ALL
  // ==========================================================================

  async findAll(
    districtId?: string,
  ) {
    return this.prisma.branch.findMany({
      where: {
        deletedAt: null,

        ...(districtId
          ? {
              districtId,
            }
          : {}),
      },

      include: {
        district: {
          include: {
            region: true,
          },
        },

        _count: {
          select: {
            staffProfiles: true,
          },
        },
      },

      orderBy: {
        name: 'asc',
      },
    });
  }

  // ==========================================================================
  // SCOPED FIND ALL
  // ==========================================================================

  async findAllScoped(
    user: AuthenticatedUser,
    districtId?: string,
  ) {
    if (
      this.scopeService.isGlobal(
        user,
      )
    ) {
      return this.findAll(
        districtId,
      );
    }

    if (districtId) {
      const allowed =
        await this.scopeService.canAccessDistrict(
          user,
          districtId,
        );

      if (!allowed) {
        const branchIds =
          this.scopeService.getBranchIds(
            user,
          );

        if (
          branchIds.length === 0
        ) {
          return [];
        }

        const belongs =
          await this.prisma.branch.findFirst({
            where: {
              id: {
                in: branchIds,
              },

              districtId,

              deletedAt: null,
            },

            select: {
              id: true,
            },
          });

        if (!belongs) {
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

    return this.prisma.branch.findMany({
      where: {
        deletedAt: null,

        ...(districtId
          ? {
              districtId,
            }
          : {}),

        OR: [
          ...(branchIds.length > 0
            ? [
                {
                  id: {
                    in: branchIds,
                  },
                },
              ]
            : []),

          ...(districtIds.length > 0
            ? [
                {
                  districtId: {
                    in: districtIds,
                  },
                },
              ]
            : []),

          ...(regionIds.length > 0
            ? [
                {
                  district: {
                    regionId: {
                      in: regionIds,
                    },

                    deletedAt: null,
                  },
                },
              ]
            : []),
        ],
      },

      include: {
        district: {
          include: {
            region: true,
          },
        },

        _count: {
          select: {
            staffProfiles: true,
          },
        },
      },

      orderBy: {
        name: 'asc',
      },
    });
  }

  // ==========================================================================
  // BASIC FIND ONE
  // ==========================================================================

  async findOne(
    id: string,
  ) {
    const branch =
      await this.prisma.branch.findFirst({
        where: {
          id,
          deletedAt: null,
        },

        include: {
          district: {
            include: {
              region: true,
            },
          },

          staffProfiles: {
            where: {
              status: 'ACTIVE',
            },

            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  firstName: true,
                  middleName: true,
                  lastName: true,
                  status: true,
                },
              },
            },
          },
        },
      });

    if (!branch) {
      throw new NotFoundException(
        'Branch not found',
      );
    }

    return branch;
  }

  // ==========================================================================
  // SCOPED FIND ONE
  // ==========================================================================

  async findOneScoped(
    id: string,
    user: AuthenticatedUser,
  ) {
    await this.scopeService.assertBranchAccess(
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
    dto: UpdateBranchDto,
  ) {
    await this.findOne(
      id,
    );

    if (dto.districtId) {
      const district =
        await this.prisma.district.findFirst({
          where: {
            id: dto.districtId,
            deletedAt: null,
          },
        });

      if (!district) {
        throw new NotFoundException(
          'District not found',
        );
      }
    }

    if (dto.code) {
      const code =
        dto.code
          .trim()
          .toUpperCase();

      const duplicate =
        await this.prisma.branch.findFirst({
          where: {
            code,

            NOT: {
              id,
            },
          },
        });

      if (duplicate) {
        throw new ConflictException(
          'Branch code already exists',
        );
      }
    }

    return this.prisma.branch.update({
      where: {
        id,
      },

      data: {
        districtId:
          dto.districtId,

        code:
          dto.code
            ?.trim()
            .toUpperCase(),

        name:
          dto.name?.trim(),

        branchType:
          dto.branchType?.trim(),

        phone:
          dto.phone?.trim(),

        email:
          dto.email
            ?.trim()
            .toLowerCase(),

        address:
          dto.address?.trim(),

        timezone:
          dto.timezone?.trim(),

        status:
          dto.status,
      },

      include: {
        district: {
          include: {
            region: true,
          },
        },
      },
    });
  }

  // ==========================================================================
  // SCOPED UPDATE
  // ==========================================================================

  async updateScoped(
    id: string,
    dto: UpdateBranchDto,
    user: AuthenticatedUser,
  ) {
    await this.scopeService.assertBranchAccess(
      user,
      id,
    );

    if (dto.districtId) {
      await this.scopeService.assertDistrictAccess(
        user,
        dto.districtId,
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

    const activeStaff =
      await this.prisma.staffProfile.count({
        where: {
          branchId: id,
          status: 'ACTIVE',
        },
      });

    if (
      activeStaff > 0
    ) {
      throw new ConflictException(
        'Branch cannot be deleted while active staff are assigned',
      );
    }

    return this.prisma.branch.update({
      where: {
        id,
      },

      data: {
        deletedAt: new Date(),
        status: 'INACTIVE',
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
    await this.scopeService.assertBranchAccess(
      user,
      id,
    );

    return this.remove(
      id,
    );
  }
}