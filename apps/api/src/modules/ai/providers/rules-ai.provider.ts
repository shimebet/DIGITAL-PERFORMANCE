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

    // ============================================================
    // HIGH ACTIVITY + LOW ACTIVATION
    // ============================================================

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

    // ============================================================
    // LOW CONVERSION
    // ============================================================

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

    // ============================================================
    // BELOW TARGET
    // ============================================================

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

    // ============================================================
    // OVERDUE FOLLOW-UP
    // ============================================================

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

    // ============================================================
    // PERFORMANCE SUMMARY
    // ============================================================

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