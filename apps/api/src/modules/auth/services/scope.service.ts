import {
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import type {
  AuthenticatedUser,
} from '../interfaces/authenticated-user.interface.js';

import {
  PrismaService,
} from '../../../database/prisma/prisma.service.js';

@Injectable()
export class ScopeService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

isGlobal(
  user:
    | AuthenticatedUser
    | undefined
    | null,
): boolean {
  if (!user) {
    return false;
  }

  return (
    user.roles?.includes(
      'SUPER_ADMIN',
    ) === true ||
    user.scopes?.some(
      (scope) =>
        scope.scopeType ===
        'GLOBAL',
    ) === true
  );
}

  async canAccessRegion(
    user: AuthenticatedUser,
    regionId: string,
  ): Promise<boolean> {
    if (this.isGlobal(user)) {
      return true;
    }

    return user.scopes.some(
      (scope) =>
        scope.scopeType ===
          'REGION' &&
        scope.regionId ===
          regionId,
    );
  }

  async canAccessDistrict(
    user: AuthenticatedUser,
    districtId: string,
  ): Promise<boolean> {
    if (this.isGlobal(user)) {
      return true;
    }

    const directDistrictAccess =
      user.scopes.some(
        (scope) =>
          scope.scopeType ===
            'DISTRICT' &&
          scope.districtId ===
            districtId,
      );

    if (directDistrictAccess) {
      return true;
    }

    const regionIds =
      user.scopes
        .filter(
          (scope) =>
            scope.scopeType ===
              'REGION' &&
            scope.regionId,
        )
        .map(
          (scope) =>
            scope.regionId!,
        );

    if (regionIds.length === 0) {
      return false;
    }

    const district =
      await this.prisma.district.findFirst({
        where: {
          id: districtId,

          regionId: {
            in: regionIds,
          },

          deletedAt: null,
        },

        select: {
          id: true,
        },
      });

    return Boolean(district);
  }

  async canAccessBranch(
    user: AuthenticatedUser,
    branchId: string,
  ): Promise<boolean> {
    if (this.isGlobal(user)) {
      return true;
    }

    const directBranchAccess =
      user.scopes.some(
        (scope) =>
          scope.scopeType ===
            'BRANCH' &&
          scope.branchId ===
            branchId,
      );

    if (directBranchAccess) {
      return true;
    }

    const districtIds =
      user.scopes
        .filter(
          (scope) =>
            scope.scopeType ===
              'DISTRICT' &&
            scope.districtId,
        )
        .map(
          (scope) =>
            scope.districtId!,
        );

    if (
      districtIds.length > 0
    ) {
      const branch =
        await this.prisma.branch.findFirst({
          where: {
            id: branchId,

            districtId: {
              in: districtIds,
            },

            deletedAt:
              null,
          },

          select: {
            id: true,
          },
        });

      if (branch) {
        return true;
      }
    }

    const regionIds =
      user.scopes
        .filter(
          (scope) =>
            scope.scopeType ===
              'REGION' &&
            scope.regionId,
        )
        .map(
          (scope) =>
            scope.regionId!,
        );

    if (
      regionIds.length === 0
    ) {
      return false;
    }

    const branch =
      await this.prisma.branch.findFirst({
        where: {
          id:
            branchId,

          deletedAt:
            null,

          district: {
            regionId: {
              in:
                regionIds,
            },

            deletedAt:
              null,
          },
        },

        select: {
          id:
            true,
        },
      });

    return Boolean(branch);
  }

  async assertRegionAccess(
    user: AuthenticatedUser,
    regionId: string,
  ) {
    const allowed =
      await this.canAccessRegion(
        user,
        regionId,
      );

    if (!allowed) {
      throw new ForbiddenException(
        'You do not have access to this region',
      );
    }
  }

  async assertDistrictAccess(
    user: AuthenticatedUser,
    districtId: string,
  ) {
    const allowed =
      await this.canAccessDistrict(
        user,
        districtId,
      );

    if (!allowed) {
      throw new ForbiddenException(
        'You do not have access to this district',
      );
    }
  }

  async assertBranchAccess(
    user: AuthenticatedUser,
    branchId: string,
  ) {
    const allowed =
      await this.canAccessBranch(
        user,
        branchId,
      );

    if (!allowed) {
      throw new ForbiddenException(
        'You do not have access to this branch',
      );
    }
  }

  getRegionIds(
    user: AuthenticatedUser,
  ): string[] {
    return user.scopes
      .filter(
        (scope) =>
          scope.scopeType ===
            'REGION' &&
          scope.regionId,
      )
      .map(
        (scope) =>
          scope.regionId!,
      );
  }

  getDistrictIds(
    user: AuthenticatedUser,
  ): string[] {
    return user.scopes
      .filter(
        (scope) =>
          scope.scopeType ===
            'DISTRICT' &&
          scope.districtId,
      )
      .map(
        (scope) =>
          scope.districtId!,
      );
  }

  getBranchIds(
    user: AuthenticatedUser,
  ): string[] {
    return user.scopes
      .filter(
        (scope) =>
          scope.scopeType ===
            'BRANCH' &&
          scope.branchId,
      )
      .map(
        (scope) =>
          scope.branchId!,
      );
  }
}