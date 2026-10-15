import { ForbiddenException, Injectable } from '@nestjs/common';

import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface.js';

import { PrismaService } from '../../../database/prisma/prisma.service.js';

@Injectable()
export class ScopeService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================================================
  // GLOBAL ACCESS
  // ==========================================================================

isGlobal(
  user: AuthenticatedUser | undefined | null,
): boolean {
  if (!user) {
    return false;
  }

  return (
    user.roleAssignments?.some(
      (assignment) =>
        assignment.scopeType === 'GLOBAL' &&
        (
          assignment.roleCode === 'SUPER_ADMIN' ||
          assignment.roleCode === 'SYSTEM_ADMIN'
        ),
    ) === true
  );
}

  // ==========================================================================
  // STAFF PROFILE HELPER
  // ==========================================================================

  private async getStaffBranchId(
    user: AuthenticatedUser,
  ): Promise<string | null> {
    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: {
        userId: user.id,
      },

      select: {
        branchId: true,
      },
    });

    return staffProfile?.branchId ?? null;
  }

  // ==========================================================================
  // REGION ACCESS
  //
  // A region is accessible when:
  //
  // 1. User is GLOBAL
  // 2. User has direct REGION scope
  // 3. User has DISTRICT scope inside that region
  // 4. User has BRANCH scope inside that region
  // 5. Staff user's assigned branch belongs to that region
  //
  // Lower-level scopes are allowed to see their parent region as context.
  // ==========================================================================

  async canAccessRegion(
    user: AuthenticatedUser,
    regionId: string,
  ): Promise<boolean> {
    if (this.isGlobal(user)) {
      return true;
    }

    // ------------------------------------------------------------------------
    // DIRECT REGION ACCESS
    // ------------------------------------------------------------------------

    const directRegionAccess = user.scopes.some(
      (scope) => scope.scopeType === 'REGION' && scope.regionId === regionId,
    );

    if (directRegionAccess) {
      return true;
    }

    // ------------------------------------------------------------------------
    // DISTRICT -> PARENT REGION
    // ------------------------------------------------------------------------

    const districtIds = this.getDistrictIds(user);

    if (districtIds.length > 0) {
      const district = await this.prisma.district.findFirst({
        where: {
          id: {
            in: districtIds,
          },

          regionId,

          deletedAt: null,
        },

        select: {
          id: true,
        },
      });

      if (district) {
        return true;
      }
    }

    // ------------------------------------------------------------------------
    // BRANCH -> DISTRICT -> PARENT REGION
    // ------------------------------------------------------------------------

    const branchIds = this.getBranchIds(user);

    if (branchIds.length > 0) {
      const branch = await this.prisma.branch.findFirst({
        where: {
          id: {
            in: branchIds,
          },

          deletedAt: null,

          district: {
            regionId,

            deletedAt: null,
          },
        },

        select: {
          id: true,
        },
      });

      if (branch) {
        return true;
      }
    }

    // ------------------------------------------------------------------------
    // STAFF -> BRANCH -> DISTRICT -> REGION
    // ------------------------------------------------------------------------

    const staffBranchId = await this.getStaffBranchId(user);

    if (staffBranchId) {
      const staffBranch = await this.prisma.branch.findFirst({
        where: {
          id: staffBranchId,

          deletedAt: null,

          district: {
            regionId,

            deletedAt: null,
          },
        },

        select: {
          id: true,
        },
      });

      if (staffBranch) {
        return true;
      }
    }

    return false;
  }

  // ==========================================================================
  // DISTRICT ACCESS
  //
  // A district is accessible when:
  //
  // 1. User is GLOBAL
  // 2. User has direct DISTRICT scope
  // 3. District belongs to user's REGION scope
  // 4. User has BRANCH scope inside the district
  // 5. Staff user's assigned branch belongs to the district
  // ==========================================================================

  async canAccessDistrict(
    user: AuthenticatedUser,
    districtId: string,
  ): Promise<boolean> {
    if (this.isGlobal(user)) {
      return true;
    }

    // ------------------------------------------------------------------------
    // DIRECT DISTRICT ACCESS
    // ------------------------------------------------------------------------

    const directDistrictAccess = user.scopes.some(
      (scope) =>
        scope.scopeType === 'DISTRICT' && scope.districtId === districtId,
    );

    if (directDistrictAccess) {
      return true;
    }

    // ------------------------------------------------------------------------
    // REGION -> CHILD DISTRICT
    // ------------------------------------------------------------------------

    const regionIds = this.getRegionIds(user);

    if (regionIds.length > 0) {
      const district = await this.prisma.district.findFirst({
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

      if (district) {
        return true;
      }
    }

    // ------------------------------------------------------------------------
    // BRANCH -> PARENT DISTRICT
    // ------------------------------------------------------------------------

    const branchIds = this.getBranchIds(user);

    if (branchIds.length > 0) {
      const branch = await this.prisma.branch.findFirst({
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

      if (branch) {
        return true;
      }
    }

    // ------------------------------------------------------------------------
    // STAFF -> BRANCH -> DISTRICT
    // ------------------------------------------------------------------------

    const staffBranchId = await this.getStaffBranchId(user);

    if (staffBranchId) {
      const staffBranch = await this.prisma.branch.findFirst({
        where: {
          id: staffBranchId,

          districtId,

          deletedAt: null,
        },

        select: {
          id: true,
        },
      });

      if (staffBranch) {
        return true;
      }
    }

    return false;
  }

  // ==========================================================================
  // BRANCH ACCESS
  //
  // A branch is accessible when:
  //
  // 1. User is GLOBAL
  // 2. User has direct BRANCH scope
  // 3. Branch belongs to user's DISTRICT scope
  // 4. Branch belongs to user's REGION scope
  // 5. Branch is the staff user's own assigned branch
  // ==========================================================================

  async canAccessBranch(
    user: AuthenticatedUser,
    branchId: string,
  ): Promise<boolean> {
    if (this.isGlobal(user)) {
      return true;
    }

    // ------------------------------------------------------------------------
    // DIRECT BRANCH ACCESS
    // ------------------------------------------------------------------------

    const directBranchAccess = user.scopes.some(
      (scope) => scope.scopeType === 'BRANCH' && scope.branchId === branchId,
    );

    if (directBranchAccess) {
      return true;
    }

    // ------------------------------------------------------------------------
    // DISTRICT -> CHILD BRANCH
    // ------------------------------------------------------------------------

    const districtIds = this.getDistrictIds(user);

    if (districtIds.length > 0) {
      const branch = await this.prisma.branch.findFirst({
        where: {
          id: branchId,

          districtId: {
            in: districtIds,
          },

          deletedAt: null,
        },

        select: {
          id: true,
        },
      });

      if (branch) {
        return true;
      }
    }

    // ------------------------------------------------------------------------
    // REGION -> DISTRICT -> CHILD BRANCH
    // ------------------------------------------------------------------------

    const regionIds = this.getRegionIds(user);

    if (regionIds.length > 0) {
      const branch = await this.prisma.branch.findFirst({
        where: {
          id: branchId,

          deletedAt: null,

          district: {
            regionId: {
              in: regionIds,
            },

            deletedAt: null,
          },
        },

        select: {
          id: true,
        },
      });

      if (branch) {
        return true;
      }
    }

    // ------------------------------------------------------------------------
    // STAFF -> OWN BRANCH
    // ------------------------------------------------------------------------

    const staffBranchId = await this.getStaffBranchId(user);

    if (staffBranchId === branchId) {
      return true;
    }

    return false;
  }

  // ==========================================================================
  // ASSERT REGION
  // ==========================================================================

  async assertRegionAccess(user: AuthenticatedUser, regionId: string) {
    const allowed = await this.canAccessRegion(user, regionId);

    if (!allowed) {
      throw new ForbiddenException('You do not have access to this region');
    }
  }

  // ==========================================================================
  // ASSERT DISTRICT
  // ==========================================================================

  async assertDistrictAccess(user: AuthenticatedUser, districtId: string) {
    const allowed = await this.canAccessDistrict(user, districtId);

    if (!allowed) {
      throw new ForbiddenException('You do not have access to this district');
    }
  }

  // ==========================================================================
  // ASSERT BRANCH
  // ==========================================================================

  async assertBranchAccess(user: AuthenticatedUser, branchId: string) {
    const allowed = await this.canAccessBranch(user, branchId);

    if (!allowed) {
      throw new ForbiddenException('You do not have access to this branch');
    }
  }

  // ==========================================================================
  // DIRECT REGION IDS
  //
  // IMPORTANT:
  // These return explicitly assigned scopes only.
  //
  // They do NOT return inferred parent regions.
  // ==========================================================================

  getRegionIds(user: AuthenticatedUser): string[] {
    return [
      ...new Set(
        user.scopes
          .filter((scope) => scope.scopeType === 'REGION' && scope.regionId)
          .map((scope) => scope.regionId!),
      ),
    ];
  }

  // ==========================================================================
  // DIRECT DISTRICT IDS
  // ==========================================================================

  getDistrictIds(user: AuthenticatedUser): string[] {
    return [
      ...new Set(
        user.scopes
          .filter((scope) => scope.scopeType === 'DISTRICT' && scope.districtId)
          .map((scope) => scope.districtId!),
      ),
    ];
  }

  // ==========================================================================
  // DIRECT BRANCH IDS
  // ==========================================================================

  getBranchIds(user: AuthenticatedUser): string[] {
    return [
      ...new Set(
        user.scopes
          .filter((scope) => scope.scopeType === 'BRANCH' && scope.branchId)
          .map((scope) => scope.branchId!),
      ),
    ];
  }
}
