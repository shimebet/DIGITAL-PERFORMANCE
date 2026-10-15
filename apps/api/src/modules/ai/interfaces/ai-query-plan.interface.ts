export type AiQueryIntent =
  | 'HIGH_ACTIVITY_LOW_ACTIVATION'
  | 'LOW_CONVERSION'
  | 'BELOW_TARGET'
  | 'OVERDUE_FOLLOW_UP'
  | 'PERFORMANCE_SUMMARY'
  | 'BEST_PERFORMING_BRANCH'
  | 'BRANCH_NEEDS_ATTENTION'
  | 'BEST_CONVERSION_BRANCH'
  | 'LOWEST_CONVERSION_BRANCH'
  | 'STAFF_BELOW_TARGET'
  | 'BEST_PERFORMING_PRODUCT'
  | 'MANAGEMENT_FOCUS'
  | 'UNKNOWN';

export interface AiQueryFilters {
  startDate?: string;
  endDate?: string;

  regionId?: string;
  districtId?: string;
  branchId?: string;
  staffId?: string;
  productId?: string;
}

export interface AiQueryPlan {
  intent: AiQueryIntent;

  confidence: number;

  filters: AiQueryFilters;

  parameters: {
    minimumVisits?: number;
    minimumEducated?: number;

    maximumActivations?: number;

    maximumConversionRate?: number;
    minimumConversionRate?: number;

    maximumAchievementRate?: number;
    minimumAchievementRate?: number;

    resultLimit?: number;
  };

  explanation: string;
}