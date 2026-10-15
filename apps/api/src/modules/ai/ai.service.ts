import {
    BadRequestException,
    Injectable,
} from '@nestjs/common';

import {
    PrismaService,
} from '../../database/prisma/prisma.service.js';

import {
    PerformanceService,
} from '../performance/performance.service.js';

import {
    ScopeService,
} from '../auth/services/scope.service.js';

import type {
    AuthenticatedUser,
} from '../auth/interfaces/authenticated-user.interface.js';

import {
    AiQueryDto,
} from './dto/ai-query.dto.js';


import {
    ManagementQueryDto,
} from './dto/management-query.dto.js';
import {
    Prisma,
} from '../../generated/prisma/client.js';

import {
    RulesAiProvider,
} from './providers/rules-ai.provider.js';

import type {
    AiQueryPlan,
} from './interfaces/ai-query-plan.interface.js';

// ============================================================================
// TYPES
// ============================================================================

type GeneratedInsight = {
    insightType:
    | 'UNDERPERFORMANCE'
    | 'OVERPERFORMANCE'
    | 'ANOMALY'
    | 'TREND'
    | 'FOLLOW_UP_GAP'
    | 'MISSED_SUBMISSION'
    | 'LOW_CONVERSION'
    | 'TARGET_GAP'
    | 'PRODUCT_PERFORMANCE'
    | 'GENERAL';

    title:
    string;

    summary:
    string;

    branchId?:
    string;

    score?:
    number;

    confidence?:
    number;

    data?:
    Prisma.InputJsonValue;

    recommendation?:
    string;
};

// ============================================================================
// SERVICE
// ============================================================================

@Injectable()
export class AiService {
    constructor(
        private readonly prisma:
            PrismaService,

        private readonly performanceService:
            PerformanceService,

        private readonly scopeService:
            ScopeService,

        private readonly aiProvider:
            RulesAiProvider,
    ) { }

    // ==========================================================================
    // GENERATE INSIGHTS
    // ==========================================================================

    async generateInsights(
        query:
            AiQueryDto,

        user:
            AuthenticatedUser,
    ) {
        const branchRows =
            await this.getAccessibleBranchPerformance(
                query,
                user,
            );
// ==========================================================================
// REMOVE UNDEFINED FILTER VALUES
// ==========================================================================


        const insights:
            GeneratedInsight[] =
            [];

        // ------------------------------------------------------------------------
        // DETECT INSIGHTS
        // ------------------------------------------------------------------------

        for (
            const row
            of branchRows
        ) {
            // ----------------------------------------------------------------------
            // LOW CONVERSION
            // ----------------------------------------------------------------------

            if (
                row.customersEducated >=
                10 &&
                row.conversionRate <
                30
            ) {
                insights.push({
                    insightType:
                        'LOW_CONVERSION',

                    title:
                        'Low activation conversion',

                    summary:
                        `${row.branchName} educated ${row.customersEducated} customers but achieved only ${row.activations} activations.`,

                    branchId:
                        row.branchId,

                    score:
                        Number(
                            row.conversionRate.toFixed(
                                2,
                            ),
                        ),

                    confidence:
                        1,

                    data: {
                        customerVisits:
                            row.customerVisits,

                        customersEducated:
                            row.customersEducated,

                        activations:
                            row.activations,

                        conversionRate:
                            row.conversionRate,
                    },

                    recommendation:
                        'Review customer objections, activation failures, staff conversion techniques and product-specific barriers.',
                });
            }

            // ----------------------------------------------------------------------
            // HIGH ACTIVITY / LOW RESULT
            // ----------------------------------------------------------------------

            if (
                row.customerVisits >=
                20 &&
                row.activations <
                5
            ) {
                insights.push({
                    insightType:
                        'UNDERPERFORMANCE',

                    title:
                        'High customer visits with low activation',

                    summary:
                        `${row.branchName} recorded ${row.customerVisits} visits but only ${row.activations} activations.`,

                    branchId:
                        row.branchId,

                    confidence:
                        1,

                    data: {
                        visits:
                            row.customerVisits,

                        activations:
                            row.activations,
                    },

                    recommendation:
                        'Review visit quality, product targeting and the conversion process at branch level.',
                });
            }

            // ----------------------------------------------------------------------
            // TARGET GAP
            // ----------------------------------------------------------------------

            if (
                row.target >
                0 &&
                row.achievementRate <
                80
            ) {
                insights.push({
                    insightType:
                        'TARGET_GAP',

                    title:
                        'Performance below target',

                    summary:
                        `${row.branchName} achieved ${row.achievementRate.toFixed(2)}% of its activation target.`,

                    branchId:
                        row.branchId,

                    score:
                        Number(
                            row.achievementRate.toFixed(
                                2,
                            ),
                        ),

                    confidence:
                        1,

                    data: {
                        target:
                            row.target,

                        actual:
                            row.activations,

                        achievementRate:
                            row.achievementRate,
                    },

                    recommendation:
                        'Review remaining target gap, required daily run-rate and product conversion opportunities.',
                });
            }

            // ----------------------------------------------------------------------
            // STRONG PERFORMANCE
            // ----------------------------------------------------------------------

            if (
                row.target >
                0 &&
                row.achievementRate >=
                100
            ) {
                insights.push({
                    insightType:
                        'OVERPERFORMANCE',

                    title:
                        'Target achieved',

                    summary:
                        `${row.branchName} achieved ${row.achievementRate.toFixed(2)}% of its activation target.`,

                    branchId:
                        row.branchId,

                    score:
                        Number(
                            row.achievementRate.toFixed(
                                2,
                            ),
                        ),

                    confidence:
                        1,

                    data: {
                        target:
                            row.target,

                        actual:
                            row.activations,

                        achievementRate:
                            row.achievementRate,
                    },

                    recommendation:
                        'Document effective practices and assess whether they can be replicated in other branches.',
                });
            }
        }

        // ------------------------------------------------------------------------
        // NORMALIZE GENERATION PERIOD
        // ------------------------------------------------------------------------

        const periodStart =
            query.startDate
                ? this.startOfDate(
                    query.startDate,
                )
                : null;

        const periodEnd =
            query.endDate
                ? this.startOfDate(
                    query.endDate,
                )
                : null;

        const saved = [];

        // ------------------------------------------------------------------------
        // SAVE / REUSE INSIGHTS
        // ------------------------------------------------------------------------

        for (
            const insight
            of insights
        ) {
            const branch =
                insight.branchId
                    ? await this.prisma.branch.findUnique({
                        where: {
                            id:
                                insight.branchId,
                        },

                        include: {
                            district: {
                                include: {
                                    region:
                                        true,
                                },
                            },
                        },
                    })
                    : null;

            // ----------------------------------------------------------------------
            // DUPLICATE PROTECTION
            //
            // Same:
            // - insight type
            // - branch
            // - product
            // - selected period
            //
            // should represent one generated insight.
            // ----------------------------------------------------------------------

            const existing =
                await this.prisma.aiInsight.findFirst({
                    where: {
                        insightType:
                            insight.insightType,

                        title:
                            insight.title,

                        branchId:
                            insight.branchId ??
                            null,

                        productId:
                            query.productId ??
                            null,

                        periodStart:
                            periodStart,

                        periodEnd:
                            periodEnd,
                    },

                    include: {
                        recommendations:
                            true,

                        branch:
                            true,

                        district:
                            true,

                        region:
                            true,

                        product:
                            true,
                    },

                    orderBy: {
                        generatedAt:
                            'desc',
                    },
                });

            // ----------------------------------------------------------------------
            // UPDATE EXISTING INSIGHT
            // ----------------------------------------------------------------------

            if (
                existing
            ) {
                const updated =
                    await this.prisma.aiInsight.update({
                        where: {
                            id:
                                existing.id,
                        },

                        data: {
                            summary:
                                insight.summary,

                            score:
                                insight.score,

                            confidence:
                                insight.confidence,

                            data:
                                insight.data,

                            regionId:
                                branch
                                    ?.district
                                    .regionId,

                            districtId:
                                branch
                                    ?.districtId,

                            branchId:
                                insight.branchId,

                            productId:
                                query.productId,

                            generatedAt:
                                new Date(),
                        },

                        include: {
                            recommendations:
                                true,

                            branch:
                                true,

                            district:
                                true,

                            region:
                                true,

                            product:
                                true,
                        },
                    });

                // --------------------------------------------------------------------
                // CREATE RECOMMENDATION ONLY IF NONE EXISTS
                // --------------------------------------------------------------------

                if (
                    insight.recommendation &&
                    existing.recommendations.length ===
                    0
                ) {
                    await this.prisma.aiRecommendation.create({
                        data: {
                            insightId:
                                updated.id,

                            title:
                                'Suggested corrective action',

                            recommendation:
                                insight.recommendation,

                            priority:
                                this.getPriority(
                                    insight.insightType,
                                ),
                        },
                    });

                    const refreshed =
                        await this.prisma.aiInsight.findUnique({
                            where: {
                                id:
                                    updated.id,
                            },

                            include: {
                                recommendations:
                                    true,

                                branch:
                                    true,

                                district:
                                    true,

                                region:
                                    true,

                                product:
                                    true,
                            },
                        });

                    if (
                        refreshed
                    ) {
                        saved.push(
                            refreshed,
                        );
                    }

                    continue;
                }

                saved.push(
                    updated,
                );

                continue;
            }

            // ----------------------------------------------------------------------
            // CREATE NEW INSIGHT
            // ----------------------------------------------------------------------

            const created =
                await this.prisma.aiInsight.create({
                    data: {
                        insightType:
                            insight.insightType,

                        title:
                            insight.title,

                        summary:
                            insight.summary,

                        scopeType:
                            insight.branchId
                                ? 'BRANCH'
                                : 'GLOBAL',

                        regionId:
                            branch
                                ?.district
                                .regionId,

                        districtId:
                            branch
                                ?.districtId,

                        branchId:
                            insight.branchId,

                        productId:
                            query.productId,

                        score:
                            insight.score,

                        confidence:
                            insight.confidence,

                        data:
                            insight.data,

                        periodStart:
                            periodStart ??
                            undefined,

                        periodEnd:
                            periodEnd ??
                            undefined,

                        recommendations:
                            insight.recommendation
                                ? {
                                    create: {
                                        title:
                                            'Suggested corrective action',

                                        recommendation:
                                            insight.recommendation,

                                        priority:
                                            this.getPriority(
                                                insight.insightType,
                                            ),
                                    },
                                }
                                : undefined,
                    },

                    include: {
                        recommendations:
                            true,

                        branch:
                            true,

                        district:
                            true,

                        region:
                            true,

                        product:
                            true,
                    },
                });

            saved.push(
                created,
            );
        }

        return {
            generated:
                saved.length,

            insights:
                saved,
        };
    }

    // ==========================================================================
    // GET STORED INSIGHTS
    // ==========================================================================

    async findAll(
        user:
            AuthenticatedUser,

        query:
            AiQueryDto = {},
    ) {
        // ------------------------------------------------------------------------
        // VALIDATE EXPLICIT ORGANIZATIONAL FILTERS
        // ------------------------------------------------------------------------

        if (
            query.regionId
        ) {
            await this.scopeService.assertRegionAccess(
                user,
                query.regionId,
            );
        }

        if (
            query.districtId
        ) {
            await this.scopeService.assertDistrictAccess(
                user,
                query.districtId,
            );
        }

        if (
            query.branchId
        ) {
            await this.scopeService.assertBranchAccess(
                user,
                query.branchId,
            );
        }

        // ------------------------------------------------------------------------
        // COMMON FILTERS
        // ------------------------------------------------------------------------

        const commonWhere:
            Prisma.AiInsightWhereInput =
        {
            ...(query.regionId
                ? {
                    regionId:
                        query.regionId,
                }
                : {}),

            ...(query.districtId
                ? {
                    districtId:
                        query.districtId,
                }
                : {}),

            ...(query.branchId
                ? {
                    branchId:
                        query.branchId,
                }
                : {}),

            ...(query.productId
                ? {
                    productId:
                        query.productId,
                }
                : {}),

            ...this.buildInsightPeriodWhere(
                query,
            ),
        };

        // ------------------------------------------------------------------------
        // GLOBAL USER
        // ------------------------------------------------------------------------

        if (
            this.scopeService.isGlobal(
                user,
            )
        ) {
            return this.prisma.aiInsight.findMany({
                where:
                    commonWhere,

                include: {
                    region:
                        true,

                    district:
                        true,

                    branch:
                        true,

                    product:
                        true,

                    recommendations:
                        true,
                },

                orderBy: {
                    generatedAt:
                        'desc',
                },
            });
        }

        // ------------------------------------------------------------------------
        // SCOPED USER
        // ------------------------------------------------------------------------

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

        const scopeOr:
            Prisma.AiInsightWhereInput[] =
            [
                {
                    userId:
                        user.id,
                },

                ...(branchIds.length
                    ? [
                        {
                            branchId: {
                                in:
                                    branchIds,
                            },
                        } satisfies Prisma.AiInsightWhereInput,
                    ]
                    : []),

                ...(districtIds.length
                    ? [
                        {
                            districtId: {
                                in:
                                    districtIds,
                            },
                        } satisfies Prisma.AiInsightWhereInput,
                    ]
                    : []),

                ...(regionIds.length
                    ? [
                        {
                            regionId: {
                                in:
                                    regionIds,
                            },
                        } satisfies Prisma.AiInsightWhereInput,
                    ]
                    : []),
            ];

        // ------------------------------------------------------------------------
        // NO ACCESSIBLE SCOPE
        // ------------------------------------------------------------------------

        if (
            scopeOr.length ===
            1 &&
            !user.id
        ) {
            return [];
        }

        return this.prisma.aiInsight.findMany({
            where: {
                AND: [
                    commonWhere,

                    {
                        OR:
                            scopeOr,
                    },
                ],
            },

            include: {
                region:
                    true,

                district:
                    true,

                branch:
                    true,

                product:
                    true,

                recommendations:
                    true,
            },

            orderBy: {
                generatedAt:
                    'desc',
            },
        });
    }

    // ==========================================================================
    // MANAGEMENT SUMMARY
    // ==========================================================================

    async managementSummary(
        query:
            AiQueryDto,

        user:
            AuthenticatedUser,
    ) {
        const performance =
            await this.performanceService.summary(
                query,
                user,
            );

        // IMPORTANT:
        // Stored insights now use the SAME filters as the performance summary.
        const insights =
            await this.findAll(
                user,
                query,
            );

        const recentInsights =
            insights.slice(
                0,
                10,
            );

        const criticalGaps =
            recentInsights.filter(
                (
                    item,
                ) =>
                    item.insightType ===
                    'UNDERPERFORMANCE' ||
                    item.insightType ===
                    'LOW_CONVERSION' ||
                    item.insightType ===
                    'TARGET_GAP',
            );

        return {
            period:
                performance.period,

            headline: {
                target:
                    performance
                        .achievement
                        .target,

                actual:
                    performance
                        .achievement
                        .value,

                achievement:
                    performance
                        .achievement
                        .percentage,

                activations:
                    performance
                        .activation
                        .activations,

                transactions:
                    performance
                        .transaction
                        .transactions,

                conversionRate:
                    performance
                        .conversion
                        .rate,
            },

            summary:
                this.buildSummaryText(
                    performance,
                    criticalGaps.length,
                ),

            keyIssues:
                criticalGaps.map(
                    (
                        item,
                    ) => ({
                        type:
                            item.insightType,

                        title:
                            item.title,

                        summary:
                            item.summary,

                        branch:
                            item.branch
                                ?.name ??
                            null,
                    }),
                ),

            recommendedActions:
                recentInsights
                    .flatMap(
                        (
                            item,
                        ) =>
                            item.recommendations,
                    )
                    .filter(
                        (
                            item,
                        ) =>
                            item.status ===
                            'NEW',
                    )
                    .slice(
                        0,
                        10,
                    ),
        };
    }

    // ==========================================================================
    // NATURAL-LANGUAGE MANAGEMENT QUERY
    // ==========================================================================

  // ==========================================================================
// NATURAL-LANGUAGE MANAGEMENT QUERY
// ==========================================================================

async managementQuery(
  dto:
    ManagementQueryDto,

  user:
    AuthenticatedUser,
) {
  const question =
    dto.question.trim();

  const interpretedPlan =
    await this.aiProvider.interpret(
      question,
    );

  // ------------------------------------------------------------------------
  // CURRENT PAGE FILTERS
  // ------------------------------------------------------------------------

  const pageFilters:
    AiQueryDto =
      {
        ...(dto.startDate
          ? {
              startDate:
                dto.startDate,
            }
          : {}),

        ...(dto.endDate
          ? {
              endDate:
                dto.endDate,
            }
          : {}),

        ...(dto.regionId
          ? {
              regionId:
                dto.regionId,
            }
          : {}),

        ...(dto.districtId
          ? {
              districtId:
                dto.districtId,
            }
          : {}),

        ...(dto.branchId
          ? {
              branchId:
                dto.branchId,
            }
          : {}),

        ...(dto.productId
          ? {
              productId:
                dto.productId,
            }
          : {}),
      };

  // ------------------------------------------------------------------------
  // MERGE CURRENT PAGE CONTEXT WITH INTERPRETED QUESTION
  //
  // Page filters provide the default context.
  // If the approved rules provider explicitly derives another filter
  // from the question, that interpreted value takes precedence.
  // ------------------------------------------------------------------------

  const filters:
    AiQueryDto =
      {
        ...pageFilters,

        ...this.removeUndefinedFilters(
          interpretedPlan.filters,
        ),
      };

  const plan:
    AiQueryPlan =
      {
        ...interpretedPlan,

        filters,
      };

  switch (
    plan.intent
  ) {
    // ======================================================================
    // HIGH ACTIVITY / LOW ACTIVATION
    // ======================================================================

    case 'HIGH_ACTIVITY_LOW_ACTIVATION': {
      const branches =
        await this.getAccessibleBranchPerformance(
          plan.filters,
          user,
        );

      const minimumVisits =
        plan.parameters.minimumVisits ??
        20;

      const maximumActivations =
        plan.parameters.maximumActivations ??
        5;

      const results =
        branches.filter(
          (
            row,
          ) =>
            row.customerVisits >=
              minimumVisits &&
            row.activations <
              maximumActivations,
        );

      return {
        question,
        plan,

        context: {
          filters:
            plan.filters,

          resultCount:
            results.length,
        },

        results,
      };
    }

    // ======================================================================
    // LOW CONVERSION
    // ======================================================================

    case 'LOW_CONVERSION': {
      const branches =
        await this.getAccessibleBranchPerformance(
          plan.filters,
          user,
        );

      const minimumEducated =
        plan.parameters.minimumEducated ??
        10;

      const maximumRate =
        plan.parameters.maximumConversionRate ??
        30;

      const results =
        branches.filter(
          (
            row,
          ) =>
            row.customersEducated >=
              minimumEducated &&
            row.conversionRate <
              maximumRate,
        );

      return {
        question,
        plan,

        context: {
          filters:
            plan.filters,

          resultCount:
            results.length,
        },

        results,
      };
    }

    // ======================================================================
    // BELOW TARGET
    // ======================================================================

    case 'BELOW_TARGET': {
      const branches =
        await this.getAccessibleBranchPerformance(
          plan.filters,
          user,
        );

      const maximumRate =
        plan.parameters.maximumAchievementRate ??
        80;

      const results =
        branches.filter(
          (
            row,
          ) =>
            row.target >
              0 &&
            row.achievementRate <
              maximumRate,
        );

      return {
        question,
        plan,

        context: {
          filters:
            plan.filters,

          resultCount:
            results.length,
        },

        results,
      };
    }

    // ======================================================================
    // OVERDUE FOLLOW-UP
    // ======================================================================

    case 'OVERDUE_FOLLOW_UP':
      return this.getOverdueFollowUps(
        question,
        plan,
        user,
      );

    // ======================================================================
    // PERFORMANCE SUMMARY
    // ======================================================================

    case 'PERFORMANCE_SUMMARY': {
      const performance =
        await this.performanceService.summary(
          plan.filters,
          user,
        );

      return {
        question,
        plan,

        context: {
          filters:
            plan.filters,
        },

        result:
          performance,
      };
    }
// ======================================================================
// BEST PERFORMING BRANCH
// ======================================================================


case 'BEST_PERFORMING_BRANCH': {
  const ranking =
    await this.performanceService.branchRanking(
      plan.filters,
      user,
    );

  const limit =
    plan.parameters.resultLimit ??
    5;

  const results =
    ranking
      // ----------------------------------------------------------------
      // Only branches with an applicable target can participate in
      // "best performing branch" ranking.
      // ----------------------------------------------------------------
      .filter(
        (
          row,
        ) => {
          const target =
            Number(
              row.target ??
                0,
            );

          return (
            Number.isFinite(
              target,
            ) &&
            target >
              0
          );
        },
      )

      // ----------------------------------------------------------------
      // Highest achievement first.
      //
      // If two branches have the same achievement percentage,
      // use conversion rate as the secondary ranking criterion.
      // ----------------------------------------------------------------
      .sort(
        (
          a,
          b,
        ) => {
          const achievementDifference =
            Number(
              b.achievementRate ??
                0,
            ) -
            Number(
              a.achievementRate ??
                0,
            );

          if (
            achievementDifference !==
            0
          ) {
            return achievementDifference;
          }

          return (
            Number(
              b.conversionRate ??
                0,
            ) -
            Number(
              a.conversionRate ??
                0,
            )
          );
        },
      )

      .slice(
        0,
        limit,
      );

  return {
    question,
    plan,

    context: {
      filters:
        plan.filters,

      resultCount:
        results.length,

      rankingRule:
        'Branches with an applicable target, ranked by achievement rate and then conversion rate.',
    },

    results,
  };
}

// ======================================================================
// BRANCH NEEDING ATTENTION
// ======================================================================

case 'BRANCH_NEEDS_ATTENTION': {
  const ranking =
    await this.performanceService.branchRanking(
      plan.filters,
      user,
    );

  const limit =
    plan.parameters.resultLimit ??
    5;

  const results =
    [...ranking]
      .filter(
        (
          row,
        ) =>
          Number(
            row.target ??
            0,
          ) >
          0,
      )
      .sort(
        (
          a,
          b,
        ) => {
          const achievementDifference =
            Number(
              a.achievementRate ??
              0,
            ) -
            Number(
              b.achievementRate ??
              0,
            );

          if (
            achievementDifference !==
            0
          ) {
            return achievementDifference;
          }

          return (
            Number(
              a.conversionRate ??
              0,
            ) -
            Number(
              b.conversionRate ??
              0,
            )
          );
        },
      )
      .slice(
        0,
        limit,
      );

  return {
    question,
    plan,

    context: {
      filters:
        plan.filters,

      resultCount:
        results.length,
    },

    results,
  };
}

// ======================================================================
// BEST CONVERSION BRANCH
// ======================================================================

case 'BEST_CONVERSION_BRANCH': {
  const ranking =
    await this.performanceService.branchRanking(
      plan.filters,
      user,
    );

  const minimumEducated =
    plan.parameters.minimumEducated ??
    1;

  const limit =
    plan.parameters.resultLimit ??
    5;

  const results =
    [...ranking]
      .filter(
        (
          row,
        ) =>
          Number(
            row.customersEducated ??
            0,
          ) >=
          minimumEducated,
      )
      .sort(
        (
          a,
          b,
        ) =>
          Number(
            b.conversionRate ??
            0,
          ) -
          Number(
            a.conversionRate ??
            0,
          ),
      )
      .slice(
        0,
        limit,
      );

  return {
    question,
    plan,

    context: {
      filters:
        plan.filters,

      resultCount:
        results.length,
    },

    results,
  };
}

// ======================================================================
// LOWEST CONVERSION BRANCH
// ======================================================================

case 'LOWEST_CONVERSION_BRANCH': {
  const ranking =
    await this.performanceService.branchRanking(
      plan.filters,
      user,
    );

  const minimumEducated =
    plan.parameters.minimumEducated ??
    1;

  const limit =
    plan.parameters.resultLimit ??
    5;

  const results =
    [...ranking]
      .filter(
        (
          row,
        ) =>
          Number(
            row.customersEducated ??
            0,
          ) >=
          minimumEducated,
      )
      .sort(
        (
          a,
          b,
        ) =>
          Number(
            a.conversionRate ??
            0,
          ) -
          Number(
            b.conversionRate ??
            0,
          ),
      )
      .slice(
        0,
        limit,
      );

  return {
    question,
    plan,

    context: {
      filters:
        plan.filters,

      resultCount:
        results.length,
    },

    results,
  };
}

// ======================================================================
// STAFF BELOW TARGET
// ======================================================================

case 'STAFF_BELOW_TARGET': {
  const ranking =
    await this.performanceService.staffRanking(
      plan.filters,
      user,
    );

  const maximumAchievementRate =
    plan.parameters.maximumAchievementRate ??
    80;

  const limit =
    plan.parameters.resultLimit ??
    20;

  const results =
    [...ranking]
      .filter(
        (
          row,
        ) =>
          Number(
            row.target ??
            0,
          ) >
            0 &&
          Number(
            row.achievementRate ??
            0,
          ) <
            maximumAchievementRate,
      )
      .sort(
        (
          a,
          b,
        ) =>
          Number(
            a.achievementRate ??
            0,
          ) -
          Number(
            b.achievementRate ??
            0,
          ),
      )
      .slice(
        0,
        limit,
      );

  return {
    question,
    plan,

    context: {
      filters:
        plan.filters,

      resultCount:
        results.length,
    },

    results,
  };
}

// ======================================================================
// BEST PERFORMING PRODUCT
// ======================================================================

case 'BEST_PERFORMING_PRODUCT': {
  const products =
    await this.performanceService.productComparison(
      plan.filters,
      user,
    );

  const limit =
    plan.parameters.resultLimit ??
    5;

  const results =
    [...products]
      .sort(
        (
          a,
          b,
        ) => {
          const activationDifference =
            Number(
              b.activations ??
              0,
            ) -
            Number(
              a.activations ??
              0,
            );

          if (
            activationDifference !==
            0
          ) {
            return activationDifference;
          }

          return (
            Number(
              b.conversionRate ??
              0,
            ) -
            Number(
              a.conversionRate ??
              0,
            )
          );
        },
      )
      .slice(
        0,
        limit,
      );

  return {
    question,
    plan,

    context: {
      filters:
        plan.filters,

      resultCount:
        results.length,
    },

    results,
  };
}

// ======================================================================
// MANAGEMENT FOCUS
// ======================================================================

case 'MANAGEMENT_FOCUS': {
  const branches =
    await this.performanceService.branchRanking(
      plan.filters,
      user,
    );

  const limit =
    plan.parameters.resultLimit ??
    5;

  const focusItems =
    branches
      .filter(
        (
          row,
        ) =>
          Number(
            row.target ??
            0,
          ) >
          0,
      )
      .map(
        (
          row,
        ) => {
          const achievementRate =
            Number(
              row.achievementRate ??
              0,
            );

          const conversionRate =
            Number(
              row.conversionRate ??
              0,
            );

          const target =
            Number(
              row.target ??
              0,
            );

          const activations =
            Number(
              row.activations ??
              0,
            );

          const remainingTarget =
            Math.max(
              target -
                activations,
              0,
            );

          let attentionScore =
            0;

          const reasons:
            string[] =
              [];

          if (
            achievementRate <
            50
          ) {
            attentionScore +=
              3;

            reasons.push(
              'Achievement is below 50%.',
            );
          } else if (
            achievementRate <
            80
          ) {
            attentionScore +=
              2;

            reasons.push(
              'Achievement is below 80%.',
            );
          }

          if (
            conversionRate <
            30
          ) {
            attentionScore +=
              2;

            reasons.push(
              'Conversion is below 30%.',
            );
          }

          if (
            remainingTarget >
            0
          ) {
            attentionScore +=
              1;

            reasons.push(
              `${remainingTarget} activation(s) remain to reach target.`,
            );
          }

          return {
            ...row,

            attentionScore,

            remainingTarget,

            reasons,

            recommendedAction:
              this.buildManagementFocusAction(
                achievementRate,
                conversionRate,
                remainingTarget,
              ),
          };
        },
      )
      .filter(
        (
          row,
        ) =>
          row.attentionScore >
          0,
      )
      .sort(
        (
          a,
          b,
        ) =>
          b.attentionScore -
          a.attentionScore,
      )
      .slice(
        0,
        limit,
      );

  return {
    question,
    plan,

    context: {
      filters:
        plan.filters,

      resultCount:
        focusItems.length,
    },

    results:
      focusItems,
  };
}

// ======================================================================
// BEST PERFORMING BRANCH
// ======================================================================

case 'BEST_PERFORMING_BRANCH': {
  const ranking =
    await this.performanceService.branchRanking(
      plan.filters,
      user,
    );

  const limit =
    plan.parameters.resultLimit ??
    5;

  const results =
    [...ranking]
      .filter(
        (row) =>
          Number(
            row.target ?? 0,
          ) > 0,
      )
      .sort(
        (
          a,
          b,
        ) =>
          Number(
            b.achievementRate ?? 0,
          ) -
          Number(
            a.achievementRate ?? 0,
          ),
      )
      .slice(
        0,
        limit,
      );

  return {
    question,
    plan,

    context: {
      filters:
        plan.filters,

      resultCount:
        results.length,
    },

    results,
  };
}

// ======================================================================
// BRANCH NEEDING MOST ATTENTION
// ======================================================================

case 'BRANCH_NEEDS_ATTENTION': {
  const ranking =
    await this.performanceService.branchRanking(
      plan.filters,
      user,
    );

  const limit =
    plan.parameters.resultLimit ??
    5;

  const results =
    [...ranking]
      .filter(
        (row) =>
          Number(
            row.target ?? 0,
          ) > 0,
      )
      .sort(
        (
          a,
          b,
        ) => {
          const achievementDifference =
            Number(
              a.achievementRate ?? 0,
            ) -
            Number(
              b.achievementRate ?? 0,
            );

          if (
            achievementDifference !==
            0
          ) {
            return achievementDifference;
          }

          return (
            Number(
              a.conversionRate ?? 0,
            ) -
            Number(
              b.conversionRate ?? 0,
            )
          );
        },
      )
      .slice(
        0,
        limit,
      );

  return {
    question,
    plan,

    context: {
      filters:
        plan.filters,

      resultCount:
        results.length,
    },

    results,
  };
}

// ======================================================================
// BEST CONVERSION BRANCH
// ======================================================================

case 'BEST_CONVERSION_BRANCH': {
  const ranking =
    await this.performanceService.branchRanking(
      plan.filters,
      user,
    );

  const minimumEducated =
    plan.parameters.minimumEducated ??
    1;

  const limit =
    plan.parameters.resultLimit ??
    5;

  const results =
    [...ranking]
      .filter(
        (row) =>
          Number(
            row.customersEducated ?? 0,
          ) >=
          minimumEducated,
      )
      .sort(
        (
          a,
          b,
        ) =>
          Number(
            b.conversionRate ?? 0,
          ) -
          Number(
            a.conversionRate ?? 0,
          ),
      )
      .slice(
        0,
        limit,
      );

  return {
    question,
    plan,

    context: {
      filters:
        plan.filters,

      resultCount:
        results.length,
    },

    results,
  };
}

// ======================================================================
// LOWEST CONVERSION BRANCH
// ======================================================================

case 'LOWEST_CONVERSION_BRANCH': {
  const ranking =
    await this.performanceService.branchRanking(
      plan.filters,
      user,
    );

  const minimumEducated =
    plan.parameters.minimumEducated ??
    1;

  const limit =
    plan.parameters.resultLimit ??
    5;

  const results =
    [...ranking]
      .filter(
        (row) =>
          Number(
            row.customersEducated ?? 0,
          ) >=
          minimumEducated,
      )
      .sort(
        (
          a,
          b,
        ) =>
          Number(
            a.conversionRate ?? 0,
          ) -
          Number(
            b.conversionRate ?? 0,
          ),
      )
      .slice(
        0,
        limit,
      );

  return {
    question,
    plan,

    context: {
      filters:
        plan.filters,

      resultCount:
        results.length,
    },

    results,
  };
}

// ======================================================================
// STAFF BELOW TARGET
// ======================================================================

case 'STAFF_BELOW_TARGET': {
  const ranking =
    await this.performanceService.staffRanking(
      plan.filters,
      user,
    );

  const maximumAchievementRate =
    plan.parameters.maximumAchievementRate ??
    80;

  const limit =
    plan.parameters.resultLimit ??
    20;

  const results =
    [...ranking]
      .filter(
        (row) =>
          Number(
            row.target ?? 0,
          ) >
            0 &&
          Number(
            row.achievementRate ?? 0,
          ) <
            maximumAchievementRate,
      )
      .sort(
        (
          a,
          b,
        ) =>
          Number(
            a.achievementRate ?? 0,
          ) -
          Number(
            b.achievementRate ?? 0,
          ),
      )
      .slice(
        0,
        limit,
      );

  return {
    question,
    plan,

    context: {
      filters:
        plan.filters,

      resultCount:
        results.length,
    },

    results,
  };
}

// ======================================================================
// BEST PERFORMING PRODUCT
// ======================================================================

case 'BEST_PERFORMING_PRODUCT': {
  const products =
    await this.performanceService.productComparison(
      plan.filters,
      user,
    );

  const limit =
    plan.parameters.resultLimit ??
    5;

  const results =
    [...products]
      .sort(
        (
          a,
          b,
        ) => {
          const activationDifference =
            Number(
              b.activations ?? 0,
            ) -
            Number(
              a.activations ?? 0,
            );

          if (
            activationDifference !==
            0
          ) {
            return activationDifference;
          }

          return (
            Number(
              b.conversionRate ?? 0,
            ) -
            Number(
              a.conversionRate ?? 0,
            )
          );
        },
      )
      .slice(
        0,
        limit,
      );

  return {
    question,
    plan,

    context: {
      filters:
        plan.filters,

      resultCount:
        results.length,
    },

    results,
  };
}

// ======================================================================
// MANAGEMENT FOCUS
// ======================================================================

case 'MANAGEMENT_FOCUS': {
  const ranking =
    await this.performanceService.branchRanking(
      plan.filters,
      user,
    );

  const limit =
    plan.parameters.resultLimit ??
    5;

  const results =
    ranking
      .filter(
        (row) =>
          Number(
            row.target ?? 0,
          ) > 0,
      )
      .map(
        (row) => {
          const target =
            Number(
              row.target ?? 0,
            );

          const activations =
            Number(
              row.activations ?? 0,
            );

          const achievementRate =
            Number(
              row.achievementRate ?? 0,
            );

          const conversionRate =
            Number(
              row.conversionRate ?? 0,
            );

          const remainingTarget =
            Math.max(
              target -
                activations,
              0,
            );

          let attentionScore =
            0;

          const reasons:
            string[] =
              [];

          if (
            achievementRate <
            50
          ) {
            attentionScore +=
              3;

            reasons.push(
              'Target achievement is below 50%.',
            );
          } else if (
            achievementRate <
            80
          ) {
            attentionScore +=
              2;

            reasons.push(
              'Target achievement is below 80%.',
            );
          }

          if (
            conversionRate <
            30
          ) {
            attentionScore +=
              2;

            reasons.push(
              'Activation conversion is below 30%.',
            );
          }

          if (
            remainingTarget >
            0
          ) {
            attentionScore +=
              1;

            reasons.push(
              `${remainingTarget} activation(s) remain to reach target.`,
            );
          }

          return {
            ...row,

            attentionScore,

            remainingTarget,

            reasons,

            recommendedAction:
              this.buildManagementFocusAction(
                achievementRate,
                conversionRate,
                remainingTarget,
              ),
          };
        },
      )
      .filter(
        (row) =>
          row.attentionScore >
          0,
      )
      .sort(
        (
          a,
          b,
        ) => {
          const scoreDifference =
            b.attentionScore -
            a.attentionScore;

          if (
            scoreDifference !==
            0
          ) {
            return scoreDifference;
          }

          return (
            Number(
              a.achievementRate ?? 0,
            ) -
            Number(
              b.achievementRate ?? 0,
            )
          );
        },
      )
      .slice(
        0,
        limit,
      );

  return {
    question,
    plan,

    context: {
      filters:
        plan.filters,

      resultCount:
        results.length,
    },

    results,
  };
}
    // ======================================================================
    // UNKNOWN
    // ======================================================================

    default:
      throw new BadRequestException(
        [
          'The management question could not be mapped to an approved analytics operation.',
          'Examples:',
          '"Show branches with high customer visits but low activation."',
          '"Show branches with low conversion."',
          '"Show branches below target."',
          '"Show overdue follow-ups."',
          '"Show overall performance."',
        ].join(
          ' ',
        ),
      );
  }
}

    // ==========================================================================
    // ACCESSIBLE BRANCH PERFORMANCE
    // ==========================================================================

    private async getAccessibleBranchPerformance(
        query:
            AiQueryDto,

        user:
            AuthenticatedUser,
    ) {
        const branches =
            await this.getAccessibleBranches(
                user,
                query,
            );

        const rows = [];

        for (
            const branch
            of branches
        ) {
            const performance =
                await this.performanceService.summary(
                    {
                        startDate:
                            query.startDate,

                        endDate:
                            query.endDate,

                        branchId:
                            branch.id,

                        productId:
                            query.productId,
                    },

                    user,
                );

            rows.push({
                regionId:
                    branch.district.regionId,

                regionName:
                    branch.district.region.name,

                districtId:
                    branch.districtId,

                districtName:
                    branch.district.name,

                branchId:
                    branch.id,

                branchCode:
                    branch.code,

                branchName:
                    branch.name,

                customerVisits:
                    performance
                        .activity
                        .customerVisits,

                customersContacted:
                    performance
                        .activity
                        .customersContacted,

                customersEducated:
                    performance
                        .activity
                        .customersEducated,

                activations:
                    performance
                        .activation
                        .activations,

                reactivations:
                    performance
                        .activation
                        .reactivations,

                transactions:
                    performance
                        .transaction
                        .transactions,

                conversionRate:
                    performance
                        .conversion
                        .rate,

                target:
                    performance
                        .achievement
                        .target,

                achievementRate:
                    performance
                        .achievement
                        .percentage,
            });
        }

        return rows;
    }

    // ==========================================================================
    // OVERDUE FOLLOW-UPS
    // ==========================================================================
// ==========================================================================
// MANAGEMENT FOCUS ACTION
// ==========================================================================


    private async getOverdueFollowUps(
        question:
            string,

        plan:
            AiQueryPlan,

        user:
            AuthenticatedUser,
    ) {
        const today =
            new Date();

        today.setHours(
            0,
            0,
            0,
            0,
        );

        const followUps =
            await this.prisma.followUp.findMany({
                where: {
                    followUpDate: {
                        lt:
                            today,
                    },

                    status: {
                        in: [
                            'OPEN',
                            'CONTACTED',
                            'RESCHEDULED',
                        ],
                    },

                    ...(plan.filters.productId
                        ? {
                            productId:
                                plan.filters.productId,
                        }
                        : {}),

                    ...(plan.filters.branchId
                        ? {
                            branchId:
                                plan.filters.branchId,
                        }
                        : {}),

                    ...(plan.filters.districtId
                        ? {
                            branch: {
                                districtId:
                                    plan.filters.districtId,
                            },
                        }
                        : {}),

                    ...(plan.filters.regionId
                        ? {
                            branch: {
                                district: {
                                    regionId:
                                        plan.filters.regionId,
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

                    product:
                        true,

                    assignedTo: {
                        select: {
                            id:
                                true,

                            username:
                                true,

                            firstName:
                                true,

                            lastName:
                                true,
                        },
                    },
                },

                orderBy: {
                    followUpDate:
                        'asc',
                },
            });

        const results = [];

        for (
            const followUp
            of followUps
        ) {
            if (
                this.scopeService.isGlobal(
                    user,
                )
            ) {
                results.push(
                    followUp,
                );

                continue;
            }

            const allowed =
                await this.scopeService.canAccessBranch(
                    user,
                    followUp.branchId,
                );

            if (
                allowed ||
                followUp.assignedToUserId ===
                user.id
            ) {
                results.push(
                    followUp,
                );
            }
        }

        return {
            question,
            plan,
            results,
        };
    }

    // ==========================================================================
    // ACCESSIBLE BRANCHES
    // ==========================================================================

    private async getAccessibleBranches(
        user:
            AuthenticatedUser,

        query:
            AiQueryDto,
    ) {
        // ------------------------------------------------------------------------
        // EXPLICIT FILTER ACCESS VALIDATION
        // ------------------------------------------------------------------------

        if (
            query.regionId
        ) {
            await this.scopeService.assertRegionAccess(
                user,
                query.regionId,
            );
        }

        if (
            query.districtId
        ) {
            await this.scopeService.assertDistrictAccess(
                user,
                query.districtId,
            );
        }

        if (
            query.branchId
        ) {
            await this.scopeService.assertBranchAccess(
                user,
                query.branchId,
            );
        }

        const explicitWhere:
            Prisma.BranchWhereInput =
        {
            deletedAt:
                null,

            ...(query.branchId
                ? {
                    id:
                        query.branchId,
                }
                : {}),

            ...(query.districtId
                ? {
                    districtId:
                        query.districtId,
                }
                : {}),

            ...(query.regionId
                ? {
                    district: {
                        regionId:
                            query.regionId,
                    },
                }
                : {}),
        };

        // ------------------------------------------------------------------------
        // GLOBAL
        // ------------------------------------------------------------------------

        if (
            this.scopeService.isGlobal(
                user,
            )
        ) {
            return this.prisma.branch.findMany({
                where:
                    explicitWhere,

                include: {
                    district: {
                        include: {
                            region:
                                true,
                        },
                    },
                },
            });
        }

        // ------------------------------------------------------------------------
        // SCOPED
        // ------------------------------------------------------------------------

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

        const accessOr:
            Prisma.BranchWhereInput[] =
            [
                ...(branchIds.length
                    ? [
                        {
                            id: {
                                in:
                                    branchIds,
                            },
                        } satisfies Prisma.BranchWhereInput,
                    ]
                    : []),

                ...(districtIds.length
                    ? [
                        {
                            districtId: {
                                in:
                                    districtIds,
                            },
                        } satisfies Prisma.BranchWhereInput,
                    ]
                    : []),

                ...(regionIds.length
                    ? [
                        {
                            district: {
                                regionId: {
                                    in:
                                        regionIds,
                                },
                            },
                        } satisfies Prisma.BranchWhereInput,
                    ]
                    : []),
            ];

        if (
            accessOr.length ===
            0
        ) {
            return [];
        }

        return this.prisma.branch.findMany({
            where: {
                AND: [
                    explicitWhere,

                    {
                        OR:
                            accessOr,
                    },
                ],
            },

            include: {
                district: {
                    include: {
                        region:
                            true,
                    },
                },
            },
        });
    }

    // ==========================================================================
    // INSIGHT PERIOD FILTER
    // ==========================================================================

    private buildInsightPeriodWhere(
        query:
            AiQueryDto,
    ):
        Prisma.AiInsightWhereInput {
        const where:
            Prisma.AiInsightWhereInput =
            {};

        if (
            query.startDate
        ) {
            where.periodStart = {
                gte:
                    this.startOfDate(
                        query.startDate,
                    ),
            };
        }

        if (
            query.endDate
        ) {
            where.periodEnd = {
                lte:
                    this.startOfDate(
                        query.endDate,
                    ),
            };
        }

        return where;
    }

    // ==========================================================================
// REMOVE UNDEFINED FILTER VALUES
// ==========================================================================

private removeUndefinedFilters(
  filters:
    AiQueryDto,
):
  AiQueryDto {
  return Object.fromEntries(
    Object.entries(
      filters,
    ).filter(
      (
        [, value],
      ) =>
        value !==
          undefined &&
        value !==
          null &&
        value !==
          '',
    ),
  ) as AiQueryDto;
}
    // ==========================================================================
    // DATE NORMALIZATION
    // ==========================================================================

    private startOfDate(
        value:
            string,
    ) {
        const date =
            new Date(
                `${value.slice(0, 10)}T00:00:00.000Z`,
            );

        return date;
    }

    // ==========================================================================
    // PRIORITY
    // ==========================================================================

    private getPriority(
        type:
            string,
    ) {
        switch (
        type
        ) {
            case 'UNDERPERFORMANCE':
            case 'TARGET_GAP':
                return 'HIGH' as const;

            case 'LOW_CONVERSION':
                return 'MEDIUM' as const;

            default:
                return 'LOW' as const;
        }
    }
// ==========================================================================
// MANAGEMENT FOCUS RECOMMENDATION
// ==========================================================================

private buildManagementFocusAction(
  achievementRate:
    number,

  conversionRate:
    number,

  remainingTarget:
    number,
) {
  const actions:
    string[] =
      [];

  if (
    achievementRate <
    80
  ) {
    actions.push(
      'Review the target gap and required daily activation run-rate',
    );
  }

  if (
    conversionRate <
    30
  ) {
    actions.push(
      'Review customer engagement quality and activation barriers',
    );
  }

  if (
    remainingTarget >
    0
  ) {
    actions.push(
      `Prioritize opportunities to close the remaining ${remainingTarget} activation target gap`,
    );
  }

  if (
    actions.length ===
    0
  ) {
    return 'Continue monitoring performance and maintain current execution.';
  }

  return `${actions.join(
    '. ',
  )}.`;
}
    // ==========================================================================
    // MANAGEMENT SUMMARY TEXT
    // ==========================================================================

    private buildSummaryText(
        performance:
            Awaited<
                ReturnType<
                    PerformanceService['summary']
                >
            >,

        issueCount:
            number,
    ) {
        return [
            `Activation achievement is ${performance.achievement.percentage}% against the applicable target.`,

            `${performance.activity.customersEducated} customers were educated or engaged, resulting in ${performance.activation.activations} activations.`,

            `${performance.transaction.transactions} resulting transactions were recorded.`,

            `The current activation conversion rate is ${performance.conversion.rate}%.`,

            `${issueCount} significant performance gap(s) are currently identified.`,
        ].join(
            ' ',
        );
    }
}