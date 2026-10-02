export type AiQueryIntent =
  | 'HIGH_ACTIVITY_LOW_ACTIVATION'
  | 'LOW_CONVERSION'
  | 'BELOW_TARGET'
  | 'OVERDUE_FOLLOW_UP'
  | 'PERFORMANCE_SUMMARY'
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
    maximumAchievementRate?: number;
  };

  explanation: string;
}