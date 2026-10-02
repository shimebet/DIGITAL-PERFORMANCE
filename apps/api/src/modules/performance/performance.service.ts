import {
  BadRequestException,
  Injectable,
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
  PerformanceQueryDto,
} from './dto/performance-query.dto.js';

@Injectable()
export class PerformanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
  ) {}

  private getDateRange(
    query: PerformanceQueryDto,
  ) {
    const endDate = query.endDate
      ? new Date(query.endDate)
      : new Date();

    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(
          endDate.getFullYear(),
          endDate.getMonth(),
          1,
        );

    if (endDate < startDate) {
      throw new BadRequestException(
        'endDate must be greater than or equal to startDate',
      );
    }

    endDate.setHours(
      23,
      59,
      59,
      999,
    );

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
      await this.scopeService.assertRegionAccess(
        user,
        query.regionId,
      );
    }

    if (query.districtId) {
      await this.scopeService.assertDistrictAccess(
        user,
        query.districtId,
      );
    }

    if (query.branchId) {
      await this.scopeService.assertBranchAccess(
        user,
        query.branchId,
      );
    }
  }
  async productComparison(
  query: PerformanceQueryDto,
  user: AuthenticatedUser,
) {
  await this.validateScope(
    user,
    query,
  );

  const {
    startDate,
    endDate,
  } = this.getDateRange(
    query,
  );

  const activities =
    await this.prisma.activityProduct.findMany({
      where: {
        activity: {
          activityDate: {
            gte: startDate,
            lte: endDate,
          },

          ...(query.branchId
            ? {
                branchId:
                  query.branchId,
              }
            : {}),

          ...(query.staffId
            ? {
                staffId:
                  query.staffId,
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
        },
      },

      include: {
        product:
          true,
      },
    });

  const map =
    new Map<
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
    const row =
      map.get(
        item.productId,
      ) ?? {
        productId:
          item.productId,

        code:
          item.product.code,

        name:
          item.product.name,

        customersEngaged:
          0,

        activations:
          0,

        reactivations:
          0,

        transactions:
          0,
      };

    row.customersEngaged +=
      item.customersEngaged;

    row.activations +=
      item.activations;

    row.reactivations +=
      item.reactivations;

    row.transactions +=
      item.transactions;

    map.set(
      item.productId,
      row,
    );
  }

  return Array.from(
    map.values(),
  ).map(
    (row) => ({
      ...row,

      conversionRate:
        row.customersEngaged > 0
          ? Number(
              (
                (row.activations /
                  row.customersEngaged) *
                100
              ).toFixed(2),
            )
          : 0,

      transactionRate:
        row.activations > 0
          ? Number(
              (
                (row.transactions /
                  row.activations) *
                100
              ).toFixed(2),
            )
          : 0,
    }),
  );
}
async dailyTrend(
  query: PerformanceQueryDto,
  user: AuthenticatedUser,
) {
  await this.validateScope(
    user,
    query,
  );

  const {
    startDate,
    endDate,
  } = this.getDateRange(
    query,
  );

  const scopeFilter =
    this.buildScopeFilter(
      user,
    );

  const activities =
    await this.prisma.activity.findMany({
      where: {
        activityDate: {
          gte: startDate,
          lte: endDate,
        },

        ...(query.branchId
          ? {
              branchId:
                query.branchId,
            }
          : {}),

        ...(query.staffId
          ? {
              staffId:
                query.staffId,
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

        ...scopeFilter,
      },

      orderBy: {
        activityDate:
          'asc',
      },
    });

  const map =
    new Map<
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
    const date =
      activity.activityDate
        .toISOString()
        .slice(0, 10);

    const row =
      map.get(date) ?? {
        date,
        customerVisits: 0,
        customersContacted: 0,
        customersEducated: 0,
        activations: 0,
        reactivations: 0,
        transactions: 0,
      };

    row.customerVisits +=
      activity.customerVisits;

    row.customersContacted +=
      activity.customersContacted;

    row.customersEducated +=
      activity.customersEducated;

    row.activations +=
      activity.activations;

    row.reactivations +=
      activity.reactivations;

    row.transactions +=
      activity.transactions;

    map.set(
      date,
      row,
    );
  }

  return Array.from(
    map.values(),
  ).map(
    (row) => ({
      ...row,

      conversionRate:
        row.customersEducated > 0
          ? Number(
              (
                (row.activations /
                  row.customersEducated) *
                100
              ).toFixed(2),
            )
          : 0,

      transactionRate:
        row.activations > 0
          ? Number(
              (
                (row.transactions /
                  row.activations) *
                100
              ).toFixed(2),
            )
          : 0,
    }),
  );
}
  private buildScopeFilter(
    user: AuthenticatedUser,
  ) {
    if (
      this.scopeService.isGlobal(
        user,
      )
    ) {
      return {};
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

    return {
      OR: [
        {
          staffId:
            user.id,
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

  async summary(
    query: PerformanceQueryDto,
    user: AuthenticatedUser,
  ) {
    await this.validateScope(
      user,
      query,
    );

    const {
      startDate,
      endDate,
    } = this.getDateRange(
      query,
    );

    const scopeFilter =
      this.buildScopeFilter(
        user,
      );

    const activities =
      await this.prisma.activity.findMany({
        where: {
          activityDate: {
            gte: startDate,
            lte: endDate,
          },

          ...(query.branchId
            ? {
                branchId:
                  query.branchId,
              }
            : {}),

          ...(query.staffId
            ? {
                staffId:
                  query.staffId,
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

          ...scopeFilter,

          ...(query.productId
            ? {
                products: {
                  some: {
                    productId:
                      query.productId,
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
                  region:
                    true,
                },
              },
            },
          },

          products: {
            include: {
              product:
                true,
            },
          },
        },
      });

    let customerVisits = 0;
    let phoneCalls = 0;
    let customersContacted = 0;
    let customersEducated = 0;
    let activations = 0;
    let reactivations = 0;
    let transactions = 0;

    for (const activity of activities) {
      customerVisits +=
        activity.customerVisits;

      phoneCalls +=
        activity.phoneCalls;

      customersContacted +=
        activity.customersContacted;

      customersEducated +=
        activity.customersEducated;

      if (query.productId) {
        const productRecord =
          activity.products.find(
            (item) =>
              item.productId ===
              query.productId,
          );

        if (productRecord) {
          activations +=
            productRecord.activations;

          reactivations +=
            productRecord.reactivations;

          transactions +=
            productRecord.transactions;
        }
      } else {
        activations +=
          activity.activations;

        reactivations +=
          activity.reactivations;

        transactions +=
          activity.transactions;
      }
    }

    const conversionRate =
      customersEducated > 0
        ? (
            activations /
            customersEducated
          ) * 100
        : 0;

    const transactionConversionRate =
      activations > 0
        ? (
            transactions /
            activations
          ) * 100
        : 0;

    const target =
      await this.resolveTarget(
        query,
        startDate,
        endDate,
      );

    const targetValue =
      target?.targetValue
        ? Number(
            target.targetValue,
          )
        : 0;

    const achievementRate =
      targetValue > 0
        ? (
            activations /
            targetValue
          ) * 100
        : 0;

    return {
      period: {
        startDate,
        endDate,
      },

      target:
        targetValue,

      activity: {
        customerVisits,
        phoneCalls,
        customersContacted,
        customersEducated,
      },

      conversion: {
        rate:
          Number(
            conversionRate.toFixed(
              2,
            ),
          ),
      },

      activation: {
        activations,
        reactivations,
      },

      transaction: {
        transactions,

        conversionRate:
          Number(
            transactionConversionRate.toFixed(
              2,
            ),
          ),
      },

      achievement: {
        value:
          activations,

        target:
          targetValue,

        percentage:
          Number(
            achievementRate.toFixed(
              2,
            ),
          ),
      },

      activityCount:
        activities.length,
    };
  }

  private async resolveTarget(
    query: PerformanceQueryDto,
    startDate: Date,
    endDate: Date,
  ) {
    const baseWhere = {
      target: {
        status:
          'ACTIVE' as const,

        deletedAt:
          null,

        startDate: {
          lte: endDate,
        },

        endDate: {
          gte: startDate,
        },

        metricType:
          'ACTIVATION' as const,
      },

      ...(query.productId
        ? {
            productId:
              query.productId,
          }
        : {
            productId:
              null,
          }),
    };

    if (query.staffId) {
      return this.prisma.targetAssignment.findFirst({
        where: {
          ...baseWhere,
          scopeType:
            'STAFF',

          userId:
            query.staffId,
        },

        orderBy: {
          createdAt:
            'desc',
        },
      });
    }

    if (query.branchId) {
      return this.prisma.targetAssignment.findFirst({
        where: {
          ...baseWhere,
          scopeType:
            'BRANCH',

          branchId:
            query.branchId,
        },

        orderBy: {
          createdAt:
            'desc',
        },
      });
    }

    if (query.districtId) {
      return this.prisma.targetAssignment.findFirst({
        where: {
          ...baseWhere,
          scopeType:
            'DISTRICT',

          districtId:
            query.districtId,
        },

        orderBy: {
          createdAt:
            'desc',
        },
      });
    }

    if (query.regionId) {
      return this.prisma.targetAssignment.findFirst({
        where: {
          ...baseWhere,
          scopeType:
            'REGION',

          regionId:
            query.regionId,
        },

        orderBy: {
          createdAt:
            'desc',
        },
      });
    }

    return this.prisma.targetAssignment.findFirst({
      where: {
        ...baseWhere,
        scopeType:
          'GLOBAL',
      },

      orderBy: {
        createdAt:
          'desc',
      },
    });
  }
}