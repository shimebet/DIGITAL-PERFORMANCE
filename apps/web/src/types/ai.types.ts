// src/types/ai.types.ts

export interface AiQuery {
  startDate?: string;
  endDate?: string;

  regionId?: string;
  districtId?: string;
  branchId?: string;
  productId?: string;
}

export type AiInsightType =
  | 'UNDERPERFORMANCE'
  | 'LOW_CONVERSION'
  | 'TARGET_GAP'
  | 'OVERPERFORMANCE'
  | string;

export type AiRecommendationPriority =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL'
  | string;

export interface AiRecommendation {
  id: string;

  title: string;

  recommendation: string;

  priority: AiRecommendationPriority;

  status: string;

  createdAt?: string;
  updatedAt?: string;
}

export interface AiOrganizationEntity {
  id: string;
  code?: string;
  name: string;
}

export interface AiInsight {
  id: string;

  insightType: AiInsightType;

  title: string;

  summary: string;

  scopeType: string;

  regionId?: string | null;
  districtId?: string | null;
  branchId?: string | null;
  productId?: string | null;
  userId?: string | null;

  score?: number | null;
  confidence?: number | null;

  data?: Record<
    string,
    unknown
  > | null;

  periodStart?: string | null;
  periodEnd?: string | null;

  generatedAt: string;

  region?: AiOrganizationEntity | null;
  district?: AiOrganizationEntity | null;
  branch?: AiOrganizationEntity | null;
  product?: AiOrganizationEntity | null;

  recommendations:
    AiRecommendation[];
}

export interface AiGenerateResult {
  generated: number;

  insights:
    AiInsight[];
}

export interface AiManagementHeadline {
  target: number;
  actual: number;
  achievement: number;
  activations: number;
  transactions: number;
  conversionRate: number;
}

export interface AiManagementIssue {
  type: string;

  title: string;

  summary: string;

  branch:
    | string
    | null;
}

export interface AiManagementSummary {
  period: {
    startDate: string;
    endDate: string;
  };

  headline:
    AiManagementHeadline;

  summary: string;

  keyIssues:
    AiManagementIssue[];

  recommendedActions:
    AiRecommendation[];
}

export interface AiManagementQueryRequest {
  question: string;
}

export interface AiQueryPlan {
  intent: string;

  filters:
    AiQuery;

  parameters:
    Record<
      string,
      number | string | boolean | null | undefined
    >;
}

export interface AiManagementQueryResponse {
  question: string;

  plan:
    AiQueryPlan;

  result?: unknown;

  results?: unknown[];
}
export interface AiGenerateResponse {
  generated: number;
  insights: AiInsight[];
}