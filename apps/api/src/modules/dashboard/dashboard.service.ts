import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma/prisma.service.js';

import { PerformanceService } from '../performance/performance.service.js';

import { ScopeService } from '../auth/services/scope.service.js';

import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';

import { DashboardQueryDto } from './dto/dashboard-query.dto.js';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,

    private readonly performanceService: PerformanceService,

    private readonly scopeService: ScopeService,
  ) {}

  async overview(query: DashboardQueryDto, user: AuthenticatedUser) {
    const performance = await this.performanceService.summary(query, user);

    const submissionStats = await this.getSubmissionStats(query, user);

    const followUpStats = await this.getFollowUpStats(query, user);

    return {
      performance,
      submissions: submissionStats,
      followUps: followUpStats,
    };
  }

  private async getSubmissionStats(
    query: DashboardQueryDto,
    user: AuthenticatedUser,
  ) {
    const where: any = {};

    // ==========================================================================
    // DATE FILTER
    // ==========================================================================

    if (query.startDate) {
      where.submissionDate = {
        ...(where.submissionDate ?? {}),

        gte: new Date(query.startDate),
      };
    }

    if (query.endDate) {
      where.submissionDate = {
        ...(where.submissionDate ?? {}),

        lte: new Date(query.endDate),
      };
    }

    // ==========================================================================
    // DIGITAL STAFF
    //
    // Digital Staff must only see their own submissions.
    //
    // Do this BEFORE evaluating region/district/branch filters so a manually
    // supplied organization ID can never widen access.
    // ==========================================================================

    if (user.roles.includes('DIGITAL_RESKILLED_STAFF')) {
      where.staffId = user.id;
    }

    // ==========================================================================
    // GLOBAL / MANAGEMENT USERS
    // ==========================================================================
    else if (query.branchId) {
      await this.scopeService.assertBranchAccess(user, query.branchId);

      where.branchId = query.branchId;
    } else if (query.districtId) {
      await this.scopeService.assertDistrictAccess(user, query.districtId);

      where.branch = {
        districtId: query.districtId,
      };
    } else if (query.regionId) {
      await this.scopeService.assertRegionAccess(user, query.regionId);

      where.branch = {
        district: {
          regionId: query.regionId,
        },
      };
    } else if (!this.scopeService.isGlobal(user)) {
      const regionIds = this.scopeService.getRegionIds(user);

      const districtIds = this.scopeService.getDistrictIds(user);

      const branchIds = this.scopeService.getBranchIds(user);

      where.OR = [
        {
          staffId: user.id,
        },

        ...(branchIds.length
          ? [
              {
                branchId: {
                  in: branchIds,
                },
              },
            ]
          : []),

        ...(districtIds.length
          ? [
              {
                branch: {
                  districtId: {
                    in: districtIds,
                  },
                },
              },
            ]
          : []),

        ...(regionIds.length
          ? [
              {
                branch: {
                  district: {
                    regionId: {
                      in: regionIds,
                    },
                  },
                },
              },
            ]
          : []),
      ];
    }

    // ==========================================================================
    // GROUP BY STATUS
    // ==========================================================================

    const grouped = await this.prisma.dailySubmission.groupBy({
      by: ['status'],

      where,

      _count: {
        _all: true,
      },
    });

    const result: Record<string, number> = {};

    for (const item of grouped) {
      result[item.status] = item._count._all;
    }

    return {
      total: grouped.reduce((sum, item) => sum + item._count._all, 0),

      draft: result.DRAFT ?? 0,

      submitted: result.SUBMITTED ?? 0,

      resubmitted: result.RESUBMITTED ?? 0,

      reviewed: result.REVIEWED ?? 0,

      approved: result.APPROVED ?? 0,

      returned: result.RETURNED_FOR_CORRECTION ?? 0,

      rejected: result.REJECTED ?? 0,
    };
  }

  private async getFollowUpStats(
    query: DashboardQueryDto,
    user: AuthenticatedUser,
  ) {
    const where: any = {};

    // ==========================================================================
    // DIGITAL STAFF
    //
    // Digital Staff must only see follow-ups assigned to themselves.
    // ==========================================================================

    if (user.roles.includes('DIGITAL_RESKILLED_STAFF')) {
      where.assignedToUserId = user.id;
    }

    // ==========================================================================
    // MANAGEMENT / ORGANIZATIONAL FILTERS
    // ==========================================================================
    else if (query.branchId) {
      await this.scopeService.assertBranchAccess(user, query.branchId);

      where.branchId = query.branchId;
    } else if (query.districtId) {
      await this.scopeService.assertDistrictAccess(user, query.districtId);

      where.branch = {
        districtId: query.districtId,
      };
    } else if (query.regionId) {
      await this.scopeService.assertRegionAccess(user, query.regionId);

      where.branch = {
        district: {
          regionId: query.regionId,
        },
      };
    } else if (!this.scopeService.isGlobal(user)) {
      const regionIds = this.scopeService.getRegionIds(user);

      const districtIds = this.scopeService.getDistrictIds(user);

      const branchIds = this.scopeService.getBranchIds(user);

      where.OR = [
        {
          assignedToUserId: user.id,
        },

        ...(branchIds.length
          ? [
              {
                branchId: {
                  in: branchIds,
                },
              },
            ]
          : []),

        ...(districtIds.length
          ? [
              {
                branch: {
                  districtId: {
                    in: districtIds,
                  },
                },
              },
            ]
          : []),

        ...(regionIds.length
          ? [
              {
                branch: {
                  district: {
                    regionId: {
                      in: regionIds,
                    },
                  },
                },
              },
            ]
          : []),
      ];
    }

    // ==========================================================================
    // STATUS SUMMARY
    // ==========================================================================

    const grouped = await this.prisma.followUp.groupBy({
      by: ['status'],

      where,

      _count: {
        _all: true,
      },
    });

    const values: Record<string, number> = {};

    for (const item of grouped) {
      values[item.status] = item._count._all;
    }

    // ==========================================================================
    // OVERDUE
    // ==========================================================================

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const overdue = await this.prisma.followUp.count({
      where: {
        ...where,

        followUpDate: {
          lt: today,
        },

        status: {
          notIn: ['CONVERTED', 'CLOSED'],
        },
      },
    });

    return {
      total: grouped.reduce((sum, item) => sum + item._count._all, 0),

      open: values.OPEN ?? 0,

      contacted: values.CONTACTED ?? 0,

      converted: values.CONVERTED ?? 0,

      rescheduled: values.RESCHEDULED ?? 0,

      overdue,
    };
  }

  async branchRanking(query: DashboardQueryDto, user: AuthenticatedUser) {
    const branches = this.scopeService.isGlobal(user)
      ? await this.prisma.branch.findMany({
          where: {
            deletedAt: null,

            ...(query.districtId
              ? {
                  districtId: query.districtId,
                }
              : {}),

            ...(query.regionId
              ? {
                  district: {
                    regionId: query.regionId,
                  },
                }
              : {}),
          },

          include: {
            district: {
              include: {
                region: true,
              },
            },
          },
        })
      : await this.getAccessibleBranches(user);

    const rows = [];

    for (const branch of branches) {
      const result = await this.performanceService.summary(
        {
          ...query,
          regionId: undefined,
          districtId: undefined,
          branchId: branch.id,
          staffId: undefined,
        },
        user,
      );

      rows.push({
        branchId: branch.id,

        branchCode: branch.code,

        branchName: branch.name,

        districtName: branch.district.name,

        regionName: branch.district.region.name,

        target: result.achievement.target,

        activations: result.activation.activations,

        transactions: result.transaction.transactions,

        conversionRate: result.conversion.rate,

        achievementRate: result.achievement.percentage,
      });
    }

    return rows.sort((a, b) => b.achievementRate - a.achievementRate);
  }

  private async getAccessibleBranches(user: AuthenticatedUser) {
    // ------------------------------------------------------------------------
    // Explicit organizational scopes
    // ------------------------------------------------------------------------

    const regionIds = this.scopeService.getRegionIds(user);

    const districtIds = this.scopeService.getDistrictIds(user);

    const branchIds = this.scopeService.getBranchIds(user);

    // ------------------------------------------------------------------------
    // STAFF SCOPE
    //
    // Digital Reskilled Staff normally has STAFF scope rather than BRANCH
    // scope. StaffProfile is therefore the authoritative source for the
    // employee's assigned branch.
    // ------------------------------------------------------------------------

    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: {
        userId: user.id,
      },

      select: {
        branchId: true,
      },
    });

    const accessibleBranchIds = new Set<string>(branchIds);

    if (staffProfile?.branchId) {
      accessibleBranchIds.add(staffProfile.branchId);
    }

    // ------------------------------------------------------------------------
    // SECURITY
    //
    // A non-global user with no resolvable organizational assignment must
    // receive no branches.
    // ------------------------------------------------------------------------

    const orConditions: any[] = [];

    if (accessibleBranchIds.size > 0) {
      orConditions.push({
        id: {
          in: [...accessibleBranchIds],
        },
      });
    }

    if (districtIds.length > 0) {
      orConditions.push({
        districtId: {
          in: districtIds,
        },
      });
    }

    if (regionIds.length > 0) {
      orConditions.push({
        district: {
          regionId: {
            in: regionIds,
          },
        },
      });
    }

    if (orConditions.length === 0) {
      return [];
    }

    return this.prisma.branch.findMany({
      where: {
        deletedAt: null,

        OR: orConditions,
      },

      include: {
        district: {
          include: {
            region: true,
          },
        },
      },

      orderBy: {
        name: 'asc',
      },
    });
  }
}
