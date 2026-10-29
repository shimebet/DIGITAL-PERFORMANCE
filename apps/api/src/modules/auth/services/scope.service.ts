
import { ForbiddenException, Injectable } from '@nestjs/common';

import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface.js';
import { PrismaService } from '../../../database/prisma/prisma.service.js';

@Injectable()
export class ScopeService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // GLOBAL ACCESS
  // ============================================================

  isGlobal(user: AuthenticatedUser | undefined | null): boolean {
    if (!user) {
      return false;
    }

    return (
      user.roleAssignments?.some(
        (assignment) =>
          assignment.scopeType === 'GLOBAL' &&
          (assignment.roleCode === 'SUPER_ADMIN' ||
            assignment.roleCode === 'SYSTEM_ADMIN'),
      ) === true
    );
  }

  // ============================================================
  // STAFF PROFILE ACCESS
  //
  // Only an exclusively assigned Digital Reskilled Staff
  // account may use its staff profile as an access scope.
  //
  // Management and mixed-role accounts cannot gain additional
  // organizational access through their staff profile.
  // ============================================================

  private canUseStaffProfileScope(user: AuthenticatedUser): boolean {
    return (
      user.roles.length === 1 &&
      user.roles[0] === 'DIGITAL_RESKILLED_STAFF' &&
      user.roleAssignments?.some(
        (assignment) =>
          assignment.roleCode === 'DIGITAL_RESKILLED_STAFF' &&
          assignment.scopeType === 'STAFF',
      ) === true
    );
  }

  private async getStaffBranchId(
    user: AuthenticatedUser,
  ): Promise<string | null> {
    if (!this.canUseStaffProfileScope(user)) {
      return null;
    }

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

  // ============================================================
  // REGION ACCESS
  //
  // A lower-level assignment can authorize access to its parent
  // region as context. It does not grant access to all records
  // inside that region.
  // ============================================================

  async canAccessRegion(
    user: AuthenticatedUser,
    regionId: string,
  ): Promise<boolean> {
    if (this.isGlobal(user)) {
      return true;
    }

    // Direct regional assignment
    if (this.getRegionIds(user).includes(regionId)) {
      return true;
    }

    // District assignment -> parent region
    const districtIds = this.getDistrictIds(user);

    if (districtIds.length > 0) {
      const district = await this.prisma.district.findFirst({
        where: {
          id: { in: districtIds },
          regionId,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (district) {
        return true;
      }
    }

    // Branch assignment -> parent region
    const branchIds = this.getBranchIds(user);

    if (branchIds.length > 0) {
      const branch = await this.prisma.branch.findFirst({
        where: {
          id: { in: branchIds },
          deletedAt: null,
          district: {
            regionId,
            deletedAt: null,
          },
        },
        select: { id: true },
      });

      if (branch) {
        return true;
      }
    }

    // Digital Reskilled Staff -> own branch -> parent region
    const staffBranchId = await this.getStaffBranchId(user);

    if (staffBranchId) {
      const branch = await this.prisma.branch.findFirst({
        where: {
          id: staffBranchId,
          deletedAt: null,
          district: {
            regionId,
            deletedAt: null,
          },
        },
        select: { id: true },
      });

      if (branch) {
        return true;
      }
    }

    return false;
  }

  // ============================================================
  // DISTRICT ACCESS
  // ============================================================

  async canAccessDistrict(
    user: AuthenticatedUser,
    districtId: string,
  ): Promise<boolean> {
    if (this.isGlobal(user)) {
      return true;
    }

    // Direct district assignment
    if (this.getDistrictIds(user).includes(districtId)) {
      return true;
    }

    // Region assignment -> child district
    const regionIds = this.getRegionIds(user);

    if (regionIds.length > 0) {
      const district = await this.prisma.district.findFirst({
        where: {
          id: districtId,
          regionId: { in: regionIds },
          deletedAt: null,
        },
        select: { id: true },
      });

      if (district) {
        return true;
      }
    }

    // Branch assignment -> parent district
    const branchIds = this.getBranchIds(user);

    if (branchIds.length > 0) {
      const branch = await this.prisma.branch.findFirst({
        where: {
          id: { in: branchIds },
          districtId,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (branch) {
        return true;
      }
    }

    // Digital Reskilled Staff -> own branch -> parent district
    const staffBranchId = await this.getStaffBranchId(user);

    if (staffBranchId) {
      const branch = await this.prisma.branch.findFirst({
        where: {
          id: staffBranchId,
          districtId,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (branch) {
        return true;
      }
    }

    return false;
  }

  // ============================================================
  // BRANCH ACCESS
  // ============================================================

  async canAccessBranch(
    user: AuthenticatedUser,
    branchId: string,
  ): Promise<boolean> {
    if (this.isGlobal(user)) {
      return true;
    }

    // Direct branch assignment
    if (this.getBranchIds(user).includes(branchId)) {
      return true;
    }

    // District assignment -> child branch
    const districtIds = this.getDistrictIds(user);

    if (districtIds.length > 0) {
      const branch = await this.prisma.branch.findFirst({
        where: {
          id: branchId,
          districtId: { in: districtIds },
          deletedAt: null,
        },
        select: { id: true },
      });

      if (branch) {
        return true;
      }
    }

    // Region assignment -> child branch
    const regionIds = this.getRegionIds(user);

    if (regionIds.length > 0) {
      const branch = await this.prisma.branch.findFirst({
        where: {
          id: branchId,
          deletedAt: null,
          district: {
            regionId: { in: regionIds },
            deletedAt: null,
          },
        },
        select: { id: true },
      });

      if (branch) {
        return true;
      }
    }

    // Digital Reskilled Staff -> own branch only
    const staffBranchId = await this.getStaffBranchId(user);

    return staffBranchId !== null && staffBranchId === branchId;
  }

  // ============================================================
  // ACCESS ASSERTIONS
  // ============================================================

  async assertRegionAccess(
    user: AuthenticatedUser,
    regionId: string,
  ): Promise<void> {
    if (!(await this.canAccessRegion(user, regionId))) {
      throw new ForbiddenException(
        'You do not have access to this region',
      );
    }
  }

  async assertDistrictAccess(
    user: AuthenticatedUser,
    districtId: string,
  ): Promise<void> {
    if (!(await this.canAccessDistrict(user, districtId))) {
      throw new ForbiddenException(
        'You do not have access to this district',
      );
    }
  }

  async assertBranchAccess(
    user: AuthenticatedUser,
    branchId: string,
  ): Promise<void> {
    if (!(await this.canAccessBranch(user, branchId))) {
      throw new ForbiddenException(
        'You do not have access to this branch',
      );
    }
  }

  // ============================================================
  // EXPLICIT ASSIGNMENT SCOPES
  //
  // These methods return only directly assigned scopes.
  // They do not infer broader authority from parent IDs.
  // ============================================================

  getRegionIds(user: AuthenticatedUser): string[] {
    return [
      ...new Set(
        user.scopes
          .filter(
            (scope) =>
              scope.scopeType === 'REGION' &&
              Boolean(scope.regionId),
          )
          .map((scope) => scope.regionId!),
      ),
    ];
  }

  getDistrictIds(user: AuthenticatedUser): string[] {
    return [
      ...new Set(
        user.scopes
          .filter(
            (scope) =>
              scope.scopeType === 'DISTRICT' &&
              Boolean(scope.districtId),
          )
          .map((scope) => scope.districtId!),
      ),
    ];
  }

  getBranchIds(user: AuthenticatedUser): string[] {
    return [
      ...new Set(
        user.scopes
          .filter(
            (scope) =>
              scope.scopeType === 'BRANCH' &&
              Boolean(scope.branchId),
          )
          .map((scope) => scope.branchId!),
      ),
    ];
  }
}
