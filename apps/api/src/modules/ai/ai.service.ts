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
    Prisma,
} from '../../generated/prisma/client.js';
import {
    RulesAiProvider,
} from './providers/rules-ai.provider.js';
import type {
  AiQueryPlan,
} from './interfaces/ai-query-plan.interface.js';



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
        query: AiQueryDto,
        user: AuthenticatedUser,
    ) {
        const branchRows =
            await this.getAccessibleBranchPerformance(
                query,
                user,
            );

        const insights: Array<{
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

            title: string;
            summary: string;

            branchId?: string;

            score?: number;
            confidence?: number;

            data?: Prisma.InputJsonValue;

            recommendation?: string;
        }> = [];

        for (const row of branchRows) {
            // ----------------------------------------------------------------------
            // LOW CONVERSION
            // ----------------------------------------------------------------------

            if (
                row.customersEducated >= 10 &&
                row.conversionRate < 30
            ) {
                insights.push({
                    insightType: 'LOW_CONVERSION',

                    title: 'Low activation conversion',

                    summary:
                        `${row.branchName} educated ${row.customersEducated} customers but achieved only ${row.activations} activations.`,

                    branchId: row.branchId,

                    score:
                        Number(
                            row.conversionRate.toFixed(2),
                        ),

                    confidence: 1,

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
                row.customerVisits >= 20 &&
                row.activations < 5
            ) {
                insights.push({
                    insightType: 'UNDERPERFORMANCE',

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
                row.target > 0 &&
                row.achievementRate < 80
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
                            row.achievementRate.toFixed(2),
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
                row.target > 0 &&
                row.achievementRate >= 100
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
                            row.achievementRate.toFixed(2),
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

        const saved = [];

        for (const insight of insights) {
            const branch =
                insight.branchId
                    ? await this.prisma.branch.findUnique({
                        where: {
                            id:
                                insight.branchId,
                        },

                        include: {
                            district:
                                true,
                        },
                    })
                    : null;

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
                            branch?.district.regionId,

                        districtId:
                            branch?.districtId,

                        branchId:
                            insight.branchId,

                        score:
                            insight.score,

                        confidence:
                            insight.confidence,

                        data:
                            insight.data,

                        periodStart:
                            query.startDate
                                ? new Date(
                                    query.startDate,
                                )
                                : undefined,

                        periodEnd:
                            query.endDate
                                ? new Date(
                                    query.endDate,
                                )
                                : undefined,

                        recommendations: insight.recommendation
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
        user: AuthenticatedUser,
    ) {
        if (
            this.scopeService.isGlobal(
                user,
            )
        ) {
            return this.prisma.aiInsight.findMany({
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

        return this.prisma.aiInsight.findMany({
            where: {
                OR: [
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
                            },
                        ]
                        : []),

                    ...(districtIds.length
                        ? [
                            {
                                districtId: {
                                    in:
                                        districtIds,
                                },
                            },
                        ]
                        : []),

                    ...(regionIds.length
                        ? [
                            {
                                regionId: {
                                    in:
                                        regionIds,
                                },
                            },
                        ]
                        : []),
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
        query: AiQueryDto,
        user: AuthenticatedUser,
    ) {
        const performance =
            await this.performanceService.summary(
                query,
                user,
            );

        const insights =
            await this.findAll(
                user,
            );

        const recentInsights =
            insights.slice(
                0,
                10,
            );

        const criticalGaps =
            recentInsights.filter(
                (item) =>
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
                    performance.achievement.target,

                actual:
                    performance.achievement.value,

                achievement:
                    performance.achievement.percentage,

                activations:
                    performance.activation.activations,

                transactions:
                    performance.transaction.transactions,

                conversionRate:
                    performance.conversion.rate,
            },

            summary:
                this.buildSummaryText(
                    performance,
                    criticalGaps.length,
                ),

            keyIssues:
                criticalGaps.map(
                    (item) => ({
                        type:
                            item.insightType,

                        title:
                            item.title,

                        summary:
                            item.summary,

                        branch:
                            item.branch?.name ??
                            null,
                    }),
                ),

            recommendedActions:
                recentInsights
                    .flatMap(
                        (item) =>
                            item.recommendations,
                    )
                    .filter(
                        (item) =>
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

    async managementQuery(
  question: string,
  user: AuthenticatedUser,
) {
  const plan =
    await this.aiProvider.interpret(
      question,
    );

  switch (plan.intent) {
    // ==========================================================
    // HIGH ACTIVITY / LOW ACTIVATION
    // ==========================================================

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

      return {
        question,
        plan,

        results:
          branches.filter(
            (row) =>
              row.customerVisits >=
                minimumVisits &&
              row.activations <
                maximumActivations,
          ),
      };
    }

    // ==========================================================
    // LOW CONVERSION
    // ==========================================================

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

      return {
        question,
        plan,

        results:
          branches.filter(
            (row) =>
              row.customersEducated >=
                minimumEducated &&
              row.conversionRate <
                maximumRate,
          ),
      };
    }

    // ==========================================================
    // BELOW TARGET
    // ==========================================================

    case 'BELOW_TARGET': {
      const branches =
        await this.getAccessibleBranchPerformance(
          plan.filters,
          user,
        );

      const maximumRate =
        plan.parameters.maximumAchievementRate ??
        80;

      return {
        question,
        plan,

        results:
          branches.filter(
            (row) =>
              row.target >
                0 &&
              row.achievementRate <
                maximumRate,
          ),
      };
    }

    // ==========================================================
    // OVERDUE FOLLOW-UP
    // ==========================================================

    case 'OVERDUE_FOLLOW_UP':
      return this.getOverdueFollowUps(
        question,
        plan,
        user,
      );

    // ==========================================================
    // PERFORMANCE SUMMARY
    // ==========================================================

    case 'PERFORMANCE_SUMMARY': {
      const performance =
        await this.performanceService.summary(
          plan.filters,
          user,
        );

      return {
        question,
        plan,
        result:
          performance,
      };
    }

    // ==========================================================
    // UNKNOWN
    // ==========================================================

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
        ].join(' '),
      );
  }
}

    // ==========================================================================
    // ACCESSIBLE BRANCH PERFORMANCE
    // ==========================================================================

    private async getAccessibleBranchPerformance(
        query: AiQueryDto,
        user: AuthenticatedUser,
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
                    performance.activity.customerVisits,

                customersContacted:
                    performance.activity.customersContacted,

                customersEducated:
                    performance.activity.customersEducated,

                activations:
                    performance.activation.activations,

                reactivations:
                    performance.activation.reactivations,

                transactions:
                    performance.transaction.transactions,

                conversionRate:
                    performance.conversion.rate,

                target:
                    performance.achievement.target,

                achievementRate:
                    performance.achievement.percentage,
            });
        }

        return rows;
    }
private async getOverdueFollowUps(
  question: string,
  plan: AiQueryPlan,
  user: AuthenticatedUser,
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
          lt: today,
        },

        status: {
          in: [
            'OPEN',
            'CONTACTED',
            'RESCHEDULED',
          ],
        },
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

        product: true,

        assignedTo: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },

      orderBy: {
        followUpDate: 'asc',
      },
    });

  const results = [];

  for (const followUp of followUps) {
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
        user: AuthenticatedUser,
        query: AiQueryDto,
    ) {
        const explicitWhere = {
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

        return this.prisma.branch.findMany({
            where: {
                ...explicitWhere,

                OR: [
                    ...(branchIds.length
                        ? [
                            {
                                id: {
                                    in:
                                        branchIds,
                                },
                            },
                        ]
                        : []),

                    ...(districtIds.length
                        ? [
                            {
                                districtId: {
                                    in:
                                        districtIds,
                                },
                            },
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
                            },
                        ]
                        : []),
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

    private getPriority(
        type: string,
    ) {
        switch (type) {
            case 'UNDERPERFORMANCE':
            case 'TARGET_GAP':
                return 'HIGH' as const;

            case 'LOW_CONVERSION':
                return 'MEDIUM' as const;

            default:
                return 'LOW' as const;
        }
    }

    private buildSummaryText(
        performance: Awaited<
            ReturnType<
                PerformanceService['summary']
            >
        >,
        issueCount: number,
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