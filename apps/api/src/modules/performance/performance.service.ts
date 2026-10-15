import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { ScopeService } from '../auth/services/scope.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import { PerformanceQueryDto } from './dto/performance-query.dto.js';
@Injectable()
export class PerformanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
  ) {}
  private getDateRange(query: PerformanceQueryDto) {
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    if (endDate < startDate) {
      throw new BadRequestException(
        'endDate must be greater than or equal to startDate',
      );
    }
    endDate.setHours(23, 59, 59, 999);
    return {
      startDate,
      endDate,
    };
  }
  private async validateScope(
    user: AuthenticatedUser,
    query: PerformanceQueryDto,
  ) {
    if (query.regionId) {
      await this.scopeService.assertRegionAccess(user, query.regionId);
    }
    if (query.districtId) {
      await this.scopeService.assertDistrictAccess(user, query.districtId);
    }
    if (query.branchId) {
      await this.scopeService.assertBranchAccess(user, query.branchId);
    }
  }
  async productComparison(query: PerformanceQueryDto, user: AuthenticatedUser) {
    await this.validateScope(user, query);
    const { startDate, endDate } = this.getDateRange(query);
    /*
     * IMPORTANT:
     * Always apply authenticated-user
     * organizational scope.
     */
    const scopeFilter = this.buildScopeFilter(user);
    const activities = await this.prisma.activityProduct.findMany({
      where: {
        /*
         * Product filter.
         *
         * When productId is supplied,
         * only that product is returned.
         */
        ...(query.productId
          ? {
              productId: query.productId,
            }
          : {}),
        activity: {
          activityDate: {
            gte: startDate,
            lte: endDate,
          },
          /*
           * Explicit branch filter.
           */
          ...(query.branchId
            ? {
                branchId: query.branchId,
              }
            : {}),
          /*
           * Explicit staff filter.
           */
          ...(query.staffId
            ? {
                staffId: query.staffId,
              }
            : {}),
          /*
           * Explicit district filter.
           */
          ...(query.districtId
            ? {
                branch: {
                  districtId: query.districtId,
                },
              }
            : {}),
          /*
           * Explicit region filter.
           */
          ...(query.regionId
            ? {
                branch: {
                  district: {
                    regionId: query.regionId,
                  },
                },
              }
            : {}),
          /*
           * Security scope.
           *
           * SUPER_ADMIN/GLOBAL normally
           * produces no restriction.
           *
           * Regional/District/Branch/Staff
           * users remain restricted to
           * their authorized scope.
           */
          ...scopeFilter,
        },
      },
      include: {
        product: true,
      },
    });
    const map = new Map<
      string,
      {
        productId: string;
        code: string;
        name: string;
        customersEngaged: number;
        activations: number;
        reactivations: number;
        transactions: number;
      }
    >();
    for (const item of activities) {
      const existing = map.get(item.productId);
      const row = existing ?? {
        productId: item.productId,
        code: item.product.code,
        name: item.product.name,
        customersEngaged: 0,
        activations: 0,
        reactivations: 0,
        transactions: 0,
      };
      row.customersEngaged += item.customersEngaged;
      row.activations += item.activations;
      row.reactivations += item.reactivations;
      row.transactions += item.transactions;
      map.set(item.productId, row);
    }
    return Array.from(map.values())
      .map((row) => ({
        ...row,
        conversionRate:
          row.customersEngaged > 0
            ? Number(
                ((row.activations / row.customersEngaged) * 100).toFixed(2),
              )
            : 0,
        transactionRate:
          row.activations > 0
            ? Number(((row.transactions / row.activations) * 100).toFixed(2))
            : 0,
      }))
      .sort((a, b) => b.activations - a.activations);
  }
  async dailyTrend(query: PerformanceQueryDto, user: AuthenticatedUser) {
    await this.validateScope(user, query);
    const { startDate, endDate } = this.getDateRange(query);
    const scopeFilter = this.buildScopeFilter(user);
    const activities = await this.prisma.activity.findMany({
      where: {
        activityDate: {
          gte: startDate,
          lte: endDate,
        },
        ...(query.branchId
          ? {
              branchId: query.branchId,
            }
          : {}),
        ...(query.staffId
          ? {
              staffId: query.staffId,
            }
          : {}),
        ...(query.districtId
          ? {
              branch: {
                districtId: query.districtId,
              },
            }
          : {}),
        ...(query.regionId
          ? {
              branch: {
                district: {
                  regionId: query.regionId,
                },
              },
            }
          : {}),
        ...scopeFilter,
      },
      orderBy: {
        activityDate: 'asc',
      },
    });
    const map = new Map<
      string,
      {
        date: string;
        customerVisits: number;
        customersContacted: number;
        customersEducated: number;
        activations: number;
        reactivations: number;
        transactions: number;
      }
    >();
    for (const activity of activities) {
      const date = activity.activityDate.toISOString().slice(0, 10);
      const row = map.get(date) ?? {
        date,
        customerVisits: 0,
        customersContacted: 0,
        customersEducated: 0,
        activations: 0,
        reactivations: 0,
        transactions: 0,
      };
      row.customerVisits += activity.customerVisits;
      row.customersContacted += activity.customersContacted;
      row.customersEducated += activity.customersEducated;
      row.activations += activity.activations;
      row.reactivations += activity.reactivations;
      row.transactions += activity.transactions;
      map.set(date, row);
    }
    return Array.from(map.values()).map((row) => ({
      ...row,
      conversionRate:
        row.customersEducated > 0
          ? Number(((row.activations / row.customersEducated) * 100).toFixed(2))
          : 0,
      transactionRate:
        row.activations > 0
          ? Number(((row.transactions / row.activations) * 100).toFixed(2))
          : 0,
    }));
  }
  private buildScopeFilter(user: AuthenticatedUser) {
    // ==========================================================================
    // DIGITAL STAFF
    //
    // Digital Reskilled Staff must always see only their own activity data.
    //
    // Even if another organizational scope is accidentally assigned later,
    // it must never widen staff-level performance visibility.
    // ==========================================================================
    if (user.roles.includes('DIGITAL_RESKILLED_STAFF')) {
      return {
        staffId: user.id,
      };
    }
    // ==========================================================================
    // GLOBAL
    // ==========================================================================
    if (this.scopeService.isGlobal(user)) {
      return {};
    }
    // ==========================================================================
    // MANAGEMENT ORGANIZATIONAL SCOPES
    // ==========================================================================
    const regionIds = this.scopeService.getRegionIds(user);
    const districtIds = this.scopeService.getDistrictIds(user);
    const branchIds = this.scopeService.getBranchIds(user);
    return {
      OR: [
        // Own records are always visible.
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
      ],
    };
  }
  async summary(query: PerformanceQueryDto, user: AuthenticatedUser) {
    await this.validateScope(user, query);
    const { startDate, endDate } = this.getDateRange(query);
    const scopeFilter = this.buildScopeFilter(user);
    const activities = await this.prisma.activity.findMany({
      where: {
        activityDate: {
          gte: startDate,
          lte: endDate,
        },
        ...(query.branchId
          ? {
              branchId: query.branchId,
            }
          : {}),
        ...(query.staffId
          ? {
              staffId: query.staffId,
            }
          : {}),
        ...(query.districtId
          ? {
              branch: {
                districtId: query.districtId,
              },
            }
          : {}),
        ...(query.regionId
          ? {
              branch: {
                district: {
                  regionId: query.regionId,
                },
              },
            }
          : {}),
        ...scopeFilter,
        ...(query.productId
          ? {
              products: {
                some: {
                  productId: query.productId,
                },
              },
            }
          : {}),
      },
      include: {
        branch: {
          include: {
            district: {
              include: {
                region: true,
              },
            },
          },
        },
        products: {
          include: {
            product: true,
          },
        },
      },
    });
    let customerVisits = 0;
    let phoneCalls = 0;
    let customersContacted = 0;
    let customersEducated = 0;
    let productCustomersEngaged = 0;
    let activations = 0;
    let reactivations = 0;
    let transactions = 0;
    for (const activity of activities) {
      customerVisits += activity.customerVisits;
      phoneCalls += activity.phoneCalls;
      customersContacted += activity.customersContacted;
      customersEducated += activity.customersEducated;
      if (query.productId) {
        const productRecord = activity.products.find(
          (item) => item.productId === query.productId,
        );
        if (productRecord) {
          productCustomersEngaged += productRecord.customersEngaged;
          activations += productRecord.activations;
          reactivations += productRecord.reactivations;
          transactions += productRecord.transactions;
        }
      } else {
        activations += activity.activations;
        reactivations += activity.reactivations;
        transactions += activity.transactions;
      }
    }
    /*
     * General dashboard:
     * activations / customers educated.
     *
     * Product-filtered dashboard:
     * product activations / product customers engaged.
     */
    const conversionDenominator = query.productId
      ? productCustomersEngaged
      : customersEducated;
    const conversionRate =
      conversionDenominator > 0
        ? (activations / conversionDenominator) * 100
        : 0;
    const transactionConversionRate =
      activations > 0 ? (transactions / activations) * 100 : 0;
    const target = await this.resolveTarget(query, startDate, endDate, user);
    const targetValue =
      target?.targetValue !== undefined && target?.targetValue !== null
        ? Number(target.targetValue)
        : 0;
    const achievementRate =
      targetValue > 0 ? (activations / targetValue) * 100 : 0;
    return {
      period: {
        startDate,
        endDate,
      },
      target: targetValue,
      activity: {
        customerVisits,
        phoneCalls,
        customersContacted,
        customersEducated,
        /*
         * Useful when a product is selected.
         */
        productCustomersEngaged: query.productId
          ? productCustomersEngaged
          : null,
      },
      conversion: {
        rate: Number(conversionRate.toFixed(2)),
        denominator: query.productId
          ? 'CUSTOMERS_ENGAGED'
          : 'CUSTOMERS_EDUCATED',
      },
      activation: {
        activations,
        reactivations,
      },
      transaction: {
        transactions,
        conversionRate: Number(transactionConversionRate.toFixed(2)),
      },
      achievement: {
        value: activations,
        target: targetValue,
        percentage: Number(achievementRate.toFixed(2)),
      },
      activityCount: activities.length,
    };
  }
  // ==========================================================================
  // BRANCH PERFORMANCE RANKING
  // ==========================================================================
  async branchRanking(
    query: PerformanceQueryDto,
    user: AuthenticatedUser,
  ) {
    await this.validateScope(user, query);
    const { startDate, endDate } = this.getDateRange(query);
    const accessibleBranchIds =
      await this.getAccessibleTargetBranchIds(user);
    const isGlobalUser =
      this.scopeService.isGlobal(user);
    /*
     * Digital staff must never use branch ranking
     * as a way to discover other staff/branch data.
     *
     * Their own branch may be returned, but the
     * activity values remain restricted to the
     * authenticated staff member.
     */
    const isDigitalStaff =
      user.roles.includes('DIGITAL_RESKILLED_STAFF');
    const staffProfile = isDigitalStaff
      ? await this.prisma.staffProfile.findUnique({
          where: {
            userId: user.id,
          },
          select: {
            branchId: true,
          },
        })
      : null;
    const branches =
      await this.prisma.branch.findMany({
        where: {
          status: 'ACTIVE',
          ...(query.branchId
            ? {
                id: query.branchId,
              }
            : {}),
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
          ...(isDigitalStaff
            ? {
                id: staffProfile?.branchId ?? '__NO_BRANCH__',
              }
            : !isGlobalUser
              ? {
                  id: {
                    in: accessibleBranchIds ?? [],
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
        orderBy: {
          name: 'asc',
        },
      });
    const rows = await Promise.all(
      branches.map(async (branch) => {
        const rowQuery: PerformanceQueryDto = {
          ...query,
          regionId: branch.district.regionId,
          districtId: branch.districtId,
          branchId: branch.id,
          /*
           * Digital staff ranking must continue
           * to use the authenticated staff member.
           */
          ...(isDigitalStaff
            ? {
                staffId: user.id,
              }
            : {
                staffId: undefined,
              }),
        };
        const summary =
          await this.summary(
            rowQuery,
            user,
          );
        const target =
          Number(
            summary.target ?? 0,
          );
        const activations =
          Number(
            summary.activation.activations ??
              0,
          );
        const transactions =
          Number(
            summary.transaction.transactions ??
              0,
          );
        const conversionRate =
          Number(
            summary.conversion.rate ??
              0,
          );
        const achievementRate =
          Number(
            summary.achievement.percentage ??
              0,
          );
        return {
          branchId: branch.id,
          branchCode: branch.code,
          branchName: branch.name,
          districtId:
            branch.districtId,
          districtName:
            branch.district.name,
          regionId:
            branch.district.regionId,
          regionName:
            branch.district.region.name,
          target,
          customerVisits:
            Number(
              summary.activity.customerVisits ??
                0,
            ),
          customersEducated:
            Number(
              summary.activity.customersEducated ??
                0,
            ),
          activations,
          transactions,
          conversionRate,
          transactionConversionRate:
            Number(
              summary.transaction.conversionRate ??
                0,
            ),
          achievementRate,
          remainingTarget:
            Math.max(
              target - activations,
              0,
            ),
          activityCount:
            Number(
              summary.activityCount ??
                0,
            ),
status:
  this.getPerformanceStatus(
    achievementRate,
    target,
  ),
        };
      }),
    );
rows.sort(
  (a, b) => {
    const aHasTarget =
      a.target > 0 ? 1 : 0;
    const bHasTarget =
      b.target > 0 ? 1 : 0;
    return (
      bHasTarget -
        aHasTarget ||
      b.achievementRate -
        a.achievementRate ||
      b.activations -
        a.activations ||
      a.branchName.localeCompare(
        b.branchName,
      )
    );
  },
);
    return rows.map(
      (row, index) => ({
        rank: index + 1,
        ...row,
      }),
    );
  }
  // ==========================================================================
  // STAFF PERFORMANCE RANKING
  // ==========================================================================
  async staffRanking(
    query: PerformanceQueryDto,
    user: AuthenticatedUser,
  ) {
    await this.validateScope(user, query);
    const accessibleBranchIds =
      await this.getAccessibleTargetBranchIds(user);
    const isGlobalUser =
      this.scopeService.isGlobal(user);
    const isDigitalStaff =
      user.roles.includes(
        'DIGITAL_RESKILLED_STAFF',
      );
    /*
     * Staff ranking is built from StaffProfile
     * rather than UserRole.
     *
     * This keeps ranking tied to the staff member's
     * operational branch assignment.
     */
    const staffProfiles =
      await this.prisma.staffProfile.findMany({
        where: {
          status: 'ACTIVE',
          ...(isDigitalStaff
            ? {
                userId: user.id,
              }
            : query.staffId
              ? {
                  userId: query.staffId,
                }
              : {}),
          ...(query.branchId
            ? {
                branchId: query.branchId,
              }
            : {}),
          ...(query.districtId
            ? {
                branch: {
                  districtId:
                    query.districtId,
                },
              }
            : {}),
          ...(query.regionId
            ? {
                branch: {
                  district: {
                    regionId:
                      query.regionId,
                  },
                },
              }
            : {}),
          ...(!isGlobalUser &&
          !isDigitalStaff
            ? {
                branchId: {
                  in:
                    accessibleBranchIds ??
                    [],
                },
              }
            : {}),
        },
        include: {
          user: true,
          branch: {
            include: {
              district: {
                include: {
                  region: true,
                },
              },
            },
          },
        },
      });
    const rows = await Promise.all(
      staffProfiles.map(
        async (staffProfile) => {
          const rowQuery: PerformanceQueryDto =
            {
              ...query,
              regionId:
                staffProfile.branch
                  .district.regionId,
              districtId:
                staffProfile.branch
                  .districtId,
              branchId:
                staffProfile.branchId,
              staffId:
                staffProfile.userId,
            };
          const summary =
            await this.summary(
              rowQuery,
              user,
            );
          const target =
            Number(
              summary.target ?? 0,
            );
          const customerVisits =
            Number(
              summary.activity
                .customerVisits ?? 0,
            );
          const customersEducated =
            Number(
              summary.activity
                .customersEducated ?? 0,
            );
          const activations =
            Number(
              summary.activation
                .activations ?? 0,
            );
          const reactivations =
            Number(
              summary.activation
                .reactivations ?? 0,
            );
          const transactions =
            Number(
              summary.transaction
                .transactions ?? 0,
            );
          const conversionRate =
            Number(
              summary.conversion.rate ??
                0,
            );
          const achievementRate =
            Number(
              summary.achievement
                .percentage ?? 0,
            );
          return {
            staffId:
              staffProfile.userId,
            employeeNumber:
              staffProfile.employeeNumber,
            firstName:
              staffProfile.user
                .firstName,
            middleName:
              staffProfile.user
                .middleName,
            lastName:
              staffProfile.user
                .lastName,
            branchId:
              staffProfile.branchId,
            branchCode:
              staffProfile.branch.code,
            branchName:
              staffProfile.branch.name,
            districtId:
              staffProfile.branch
                .districtId,
            districtName:
              staffProfile.branch
                .district.name,
            regionId:
              staffProfile.branch
                .district.regionId,
            regionName:
              staffProfile.branch
                .district.region.name,
            target,
            customerVisits,
            customersEducated,
            activations,
            reactivations,
            transactions,
            conversionRate,
            transactionConversionRate:
              Number(
                summary.transaction
                  .conversionRate ?? 0,
              ),
            achievementRate,
            remainingTarget:
              Math.max(
                target -
                  activations,
                0,
              ),
            activityCount:
              Number(
                summary.activityCount ??
                  0,
              ),
status:
  this.getPerformanceStatus(
    achievementRate,
    target,
  ),
          };
        },
      ),
    );
    rows.sort(
      (a, b) =>
        b.achievementRate -
          a.achievementRate ||
        b.activations -
          a.activations ||
        a.firstName.localeCompare(
          b.firstName,
        ),
    );
    return rows.map(
      (row, index) => ({
        rank: index + 1,
        ...row,
      }),
    );
  }
  // ==========================================================================
  // PERFORMANCE STATUS
  // ==========================================================================
  private getPerformanceStatus(
  achievementRate: number,
  target = 0,
) {
  if (target <= 0) {
    return 'NO_TARGET';
  }
  if (achievementRate >= 100) {
    return 'ACHIEVED';
  }
  if (achievementRate >= 80) {
    return 'ON_TRACK';
  }
  if (achievementRate >= 50) {
    return 'NEEDS_ATTENTION';
  }
  return 'CRITICAL';
}
  // ==========================================================================
  // TARGET SECURITY HELPERS
  // ==========================================================================
  private async getAccessibleTargetBranchIds(user: AuthenticatedUser) {
    /*
     * Global users are unrestricted.
     *
     * null means:
     * "Do not apply branch restriction."
     */
    if (this.scopeService.isGlobal(user)) {
      return null;
    }
    const branchIds = this.scopeService.getBranchIds(user);
    const districtIds = this.scopeService.getDistrictIds(user);
    const regionIds = this.scopeService.getRegionIds(user);
    /*
     * Digital Staff normally has STAFF scope.
     *
     * Include the branch assigned through
     * StaffProfile so branch-target lookup is
     * restricted correctly.
     */
    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: {
        userId: user.id,
      },
      select: {
        branchId: true,
      },
    });
    const orConditions: Array<Record<string, unknown>> = [];
    if (branchIds.length > 0) {
      orConditions.push({
        id: {
          in: branchIds,
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
    if (staffProfile?.branchId) {
      orConditions.push({
        id: staffProfile.branchId,
      });
    }
    /*
     * Non-global user with no resolved
     * organization scope gets no branches.
     */
    if (orConditions.length === 0) {
      return [];
    }
    const accessibleBranches = await this.prisma.branch.findMany({
      where: {
        OR: orConditions,
      },
      select: {
        id: true,
      },
    });
    return [...new Set(accessibleBranches.map((branch) => branch.id))];
  }
  // ==========================================================================
  // TARGET RESOLUTION
  // ==========================================================================
  private async resolveTarget(
    query: PerformanceQueryDto,
    startDate: Date,
    endDate: Date,
    user: AuthenticatedUser,
  ) {
    // A target is a period-level allocation. General and product-specific
    // allocations are mutually exclusive for any single dashboard query.
    const isDigitalStaff = user.roles.includes('DIGITAL_RESKILLED_STAFF');
    const isGlobalUser = this.scopeService.isGlobal(user);
    const effectiveQuery: PerformanceQueryDto = isDigitalStaff
      ? { ...query, staffId: user.id }
      : query;
    const accessibleBranchIds = await this.getAccessibleTargetBranchIds(user);

    const baseWhere = {
      target: {
        status: 'ACTIVE' as const,
        deletedAt: null,
        metricType: 'ACTIVATION' as const,
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      productId: effectiveQuery.productId ?? null,
    };

    // A direct assignment takes precedence over lower-level allocations.
    // Use stable ordering if historical overlapping targets exist.
    const findDirect = async (
      scopeType: 'GLOBAL' | 'REGION' | 'DISTRICT' | 'BRANCH' | 'STAFF',
      idField?: 'regionId' | 'districtId' | 'branchId' | 'userId',
      id?: string,
    ) => {
      return this.prisma.targetAssignment.findFirst({
        where: {
          ...baseWhere,
          scopeType,
          ...(idField && id ? { [idField]: id } : {}),
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      });
    };

    // Branch aggregation uses only BRANCH assignments. It never adds
    // STAFF allocations or product breakdowns to general branch targets.
    const sumBranchTargets = async (filter: Record<string, unknown>) => {
      const assignments = await this.prisma.targetAssignment.findMany({
        where: {
          ...baseWhere,
          scopeType: 'BRANCH',
          ...filter,
          ...(!isGlobalUser
            ? { branchId: { in: accessibleBranchIds ?? [] } }
            : {}),
        },
        select: {
          id: true,
          branchId: true,
          targetValue: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      });

      // The newest assignment for a branch wins if historical overlaps
      // exist. Do not silently sum two targets for the same branch.
      const selectedBranches = new Set<string>();
      let total = 0;
      for (const assignment of assignments) {
        if (!assignment.branchId || selectedBranches.has(assignment.branchId)) {
          continue;
        }
        selectedBranches.add(assignment.branchId);
        total += Number(assignment.targetValue);
      }
      return selectedBranches.size > 0 ? { targetValue: total } : null;
    };

    // STAFF: individual allocations only. Never inherit a whole branch target.
    if (effectiveQuery.staffId) {
      const staff = await this.prisma.user.findUnique({
        where: { id: effectiveQuery.staffId },
        select: { id: true, staffProfile: { select: { branchId: true } } },
      });
      if (!staff?.staffProfile) return null;
      const staffBranchId = staff.staffProfile.branchId;
      if (
        !isGlobalUser &&
        effectiveQuery.staffId !== user.id &&
        !(accessibleBranchIds ?? []).includes(staffBranchId)
      ) return null;
      // Respect any additional explicit branch/district/region filters.
      if (effectiveQuery.branchId && effectiveQuery.branchId !== staffBranchId) {
        return null;
      }
      return findDirect('STAFF', 'userId', effectiveQuery.staffId);
    }

    // BRANCH: only the branch's direct allocation.
    if (effectiveQuery.branchId) {
      if (
        !isGlobalUser &&
        !(accessibleBranchIds ?? []).includes(effectiveQuery.branchId)
      ) return null;
      return findDirect('BRANCH', 'branchId', effectiveQuery.branchId);
    }

    // DISTRICT: prefer direct district allocation only for a user with
    // authority over the entire district; otherwise use visible branches.
    if (effectiveQuery.districtId) {
      const canUseDirect = isGlobalUser ||
        this.scopeService.getDistrictIds(user).includes(effectiveQuery.districtId) ||
        (effectiveQuery.regionId
          ? this.scopeService.getRegionIds(user).includes(effectiveQuery.regionId)
          : false);
      if (canUseDirect) {
        const direct = await findDirect('DISTRICT', 'districtId', effectiveQuery.districtId);
        if (direct) return direct;
      }
      return sumBranchTargets({ branch: { districtId: effectiveQuery.districtId } });
    }

    // REGION: prefer direct region allocation only for region/global users.
    if (effectiveQuery.regionId) {
      const canUseDirect = isGlobalUser ||
        this.scopeService.getRegionIds(user).includes(effectiveQuery.regionId);
      if (canUseDirect) {
        const direct = await findDirect('REGION', 'regionId', effectiveQuery.regionId);
        if (direct) return direct;
      }
      return sumBranchTargets({
        branch: { district: { regionId: effectiveQuery.regionId } },
      });
    }

    // Unfiltered global dashboard prefers the explicit GLOBAL target.
    if (isGlobalUser) {
      const direct = await findDirect('GLOBAL');
      if (direct) return direct;
    }
    return sumBranchTargets({});
  }
}
