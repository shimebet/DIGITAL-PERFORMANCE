import {
  Injectable,
} from '@nestjs/common';

import type {
  AiProvider,
} from '../interfaces/ai-provider.interface.js';

import type {
  AiQueryPlan,
} from '../interfaces/ai-query-plan.interface.js';

@Injectable()
export class RulesAiProvider
  implements AiProvider
{
  async interpret(
    question: string,
  ): Promise<AiQueryPlan> {
    const normalized =
      question
        .trim()
        .toLowerCase();

// =========================================================================
// BEST PERFORMING BRANCH
// =========================================================================

if (
  normalized.includes(
    'best performing branch',
  ) ||
  normalized.includes(
    'best branch',
  ) ||
  normalized.includes(
    'branch performs best',
  ) ||
  normalized.includes(
    'branch performing best',
  ) ||
  normalized.includes(
    'top performing branch',
  ) ||
  normalized.includes(
    'top branch',
  ) ||
  normalized.includes(
    'highest performing branch',
  ) ||
  normalized.includes(
    'highest performance branch',
  )
) {
  return {
    intent:
      'BEST_PERFORMING_BRANCH',

    confidence:
      1,

    filters:
      {},

    parameters: {
      resultLimit:
        5,
    },

    explanation:
      'Rank accessible branches by target achievement and return the strongest performers.',
  };
}

    // =========================================================================
    // BRANCH NEEDING MOST ATTENTION
    // =========================================================================

    if (
      normalized.includes(
        'needs the most attention',
      ) ||
      normalized.includes(
        'need the most attention',
      ) ||
      normalized.includes(
        'needs attention',
      ) ||
      normalized.includes(
        'worst performing branch',
      ) ||
      normalized.includes(
        'weakest branch',
      ) ||
      normalized.includes(
        'which branch should management focus',
      )
    ) {
      return {
        intent:
          'BRANCH_NEEDS_ATTENTION',

        confidence:
          1,

        filters:
          {},

        parameters: {
          resultLimit:
            5,
        },

        explanation:
          'Rank accessible branches by weakest target achievement and conversion performance.',
      };
    }

    // =========================================================================
    // BEST CONVERSION BRANCH
    // =========================================================================

    if (
      normalized.includes(
        'best conversion',
      ) ||
      normalized.includes(
        'highest conversion',
      ) ||
      normalized.includes(
        'best converting branch',
      ) ||
      normalized.includes(
        'highest converting branch',
      )
    ) {
      return {
        intent:
          'BEST_CONVERSION_BRANCH',

        confidence:
          1,

        filters:
          {},

        parameters: {
          minimumEducated:
            1,

          resultLimit:
            5,
        },

        explanation:
          'Rank accessible branches by activation conversion rate.',
      };
    }

    // =========================================================================
    // LOWEST CONVERSION BRANCH
    // =========================================================================

    if (
      normalized.includes(
        'lowest conversion',
      ) ||
      normalized.includes(
        'worst conversion',
      ) ||
      normalized.includes(
        'lowest converting branch',
      ) ||
      normalized.includes(
        'worst converting branch',
      )
    ) {
      return {
        intent:
          'LOWEST_CONVERSION_BRANCH',

        confidence:
          1,

        filters:
          {},

        parameters: {
          minimumEducated:
            1,

          resultLimit:
            5,
        },

        explanation:
          'Rank accessible branches by lowest activation conversion rate.',
      };
    }

    // =========================================================================
    // STAFF BELOW TARGET
    // =========================================================================

    if (
      (
        normalized.includes(
          'staff',
        ) ||
        normalized.includes(
          'employee',
        )
      ) &&
      (
        normalized.includes(
          'below target',
        ) ||
        normalized.includes(
          'underperform',
        ) ||
        normalized.includes(
          'target gap',
        )
      )
    ) {
      return {
        intent:
          'STAFF_BELOW_TARGET',

        confidence:
          1,

        filters:
          {},

        parameters: {
          maximumAchievementRate:
            80,

          resultLimit:
            20,
        },

        explanation:
          'Find staff within the authorized scope whose target achievement is below 80%.',
      };
    }

    // =========================================================================
    // BEST PERFORMING PRODUCT
    // =========================================================================

    // =========================================================================
// BEST PERFORMING PRODUCT
// =========================================================================

if (
  normalized.includes(
    'best performing product',
  ) ||
  normalized.includes(
    'best product',
  ) ||
  normalized.includes(
    'product performs best',
  ) ||
  normalized.includes(
    'product performing best',
  ) ||
  normalized.includes(
    'top performing product',
  ) ||
  normalized.includes(
    'top product',
  ) ||
  normalized.includes(
    'highest performing product',
  ) ||
  normalized.includes(
    'highest performance product',
  )
) {
  return {
    intent:
      'BEST_PERFORMING_PRODUCT',

    confidence:
      1,

    filters:
      {},

    parameters: {
      resultLimit:
        5,
    },

    explanation:
      'Rank products by activation and conversion performance within the current authorized scope.',
  };
}

    // =========================================================================
    // MANAGEMENT FOCUS
    // =========================================================================

    if (
      normalized.includes(
        'what should management focus',
      ) ||
      normalized.includes(
        'what should we focus',
      ) ||
      normalized.includes(
        'management focus',
      ) ||
      normalized.includes(
        'what needs attention today',
      ) ||
      normalized.includes(
        'what should i focus on',
      )
    ) {
      return {
        intent:
          'MANAGEMENT_FOCUS',

        confidence:
          1,

        filters:
          {},

        parameters: {
          resultLimit:
            5,
        },

        explanation:
          'Identify the highest-priority performance issues and recommended management actions within the current scope.',
      };
    }

    // =========================================================================
    // HIGH ACTIVITY + LOW ACTIVATION
    // =========================================================================

    if (
      (
        normalized.includes(
          'high customer visits',
        ) ||
        normalized.includes(
          'high visits',
        ) ||
        normalized.includes(
          'high activity',
        )
      ) &&
      (
        normalized.includes(
          'low activation',
        ) ||
        normalized.includes(
          'few activation',
        )
      )
    ) {
      return {
        intent:
          'HIGH_ACTIVITY_LOW_ACTIVATION',

        confidence:
          1,

        filters:
          {},

        parameters: {
          minimumVisits:
            20,

          maximumActivations:
            5,
        },

        explanation:
          'Find branches with at least 20 customer visits and fewer than 5 activations.',
      };
    }

    // =========================================================================
    // LOW CONVERSION
    // =========================================================================

    if (
      normalized.includes(
        'low conversion',
      ) ||
      normalized.includes(
        'poor conversion',
      )
    ) {
      return {
        intent:
          'LOW_CONVERSION',

        confidence:
          1,

        filters:
          {},

        parameters: {
          minimumEducated:
            10,

          maximumConversionRate:
            30,
        },

        explanation:
          'Find branches with sufficient customer engagement but activation conversion below 30%.',
      };
    }

    // =========================================================================
    // BELOW TARGET
    // =========================================================================

    if (
      normalized.includes(
        'below target',
      ) ||
      normalized.includes(
        'underperform',
      ) ||
      normalized.includes(
        'target gap',
      )
    ) {
      return {
        intent:
          'BELOW_TARGET',

        confidence:
          1,

        filters:
          {},

        parameters: {
          maximumAchievementRate:
            80,
        },

        explanation:
          'Find branches whose target achievement is below 80%.',
      };
    }

    // =========================================================================
    // OVERDUE FOLLOW-UP
    // =========================================================================

    if (
      normalized.includes(
        'overdue follow',
      ) ||
      normalized.includes(
        'missed follow',
      )
    ) {
      return {
        intent:
          'OVERDUE_FOLLOW_UP',

        confidence:
          1,

        filters:
          {},

        parameters:
          {},

        explanation:
          'Find open customer follow-ups whose scheduled follow-up date has passed.',
      };
    }

    // =========================================================================
    // PERFORMANCE SUMMARY
    // =========================================================================

    if (
      normalized.includes(
        'performance summary',
      ) ||
      normalized.includes(
        'summarize performance',
      ) ||
      normalized.includes(
        'overall performance',
      )
    ) {
      return {
        intent:
          'PERFORMANCE_SUMMARY',

        confidence:
          1,

        filters:
          {},

        parameters:
          {},

        explanation:
          'Return the overall performance summary available to the current user.',
      };
    }

    // =========================================================================
    // UNKNOWN
    // =========================================================================

    return {
      intent:
        'UNKNOWN',

      confidence:
        0,

      filters:
        {},

      parameters:
        {},

      explanation:
        'The question could not be mapped to an approved analytics operation.',
    };
  }
}