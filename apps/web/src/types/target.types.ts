export type TargetMetricType =
  | "CUSTOMER_VISIT"
  | "PHONE_CALL"
  | "CUSTOMER_CONTACT"
  | "CUSTOMER_ENGAGEMENT"
  | "ACTIVATION"
  | "REACTIVATION"
  | "TRANSACTION"
  | "FOLLOW_UP"
  | "CONVERSION_RATE"
  | "ACHIEVEMENT_RATE";

export type TargetPeriod =
  | "DAILY"
  | "WEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "YEARLY"
  | "CUSTOM";

export type TargetStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "ARCHIVED";

export type TargetScopeType =
  | "GLOBAL"
  | "REGION"
  | "DISTRICT"
  | "BRANCH"
  | "STAFF";

export interface Target {
  id: string;
  name: string;
  description: string | null;

  metricType: TargetMetricType;
  periodType: TargetPeriod;

  startDate: string;
  endDate: string;

  defaultTargetValue: string | number | null;

  status: TargetStatus;

  createdByUserId: string | null;

  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;

  createdBy?: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
  } | null;

  _count?: {
    assignments: number;
  };
}

export interface CreateTargetInput {
  name: string;
  description?: string;

  metricType: TargetMetricType;
  periodType: TargetPeriod;

  startDate: string;
  endDate: string;

  defaultTargetValue?: number;
}

export interface UpdateTargetInput {
  name?: string;
  description?: string;

  metricType?: TargetMetricType;
  periodType?: TargetPeriod;

  startDate?: string;
  endDate?: string;

  defaultTargetValue?: number;

  status?: TargetStatus;
}

export interface TargetAssignment {
  id: string;
  targetId: string;

  scopeType: TargetScopeType;

  regionId: string | null;
  districtId: string | null;
  branchId: string | null;
  userId: string | null;
  productId: string | null;

  targetValue: string | number;

  createdAt: string;
  updatedAt: string;

  target?: Target;

  region?: {
    id: string;
    code: string;
    name: string;
  } | null;

  district?: {
    id: string;
    code: string;
    name: string;
    regionId?: string;
  } | null;

  branch?: {
    id: string;
    code: string;
    name: string;
    districtId?: string;
  } | null;

  product?: {
    id: string;
    code: string;
    name: string;
  } | null;

  user?: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
  } | null;
}

export interface AssignTargetInput {
  targetId: string;
  scopeType: TargetScopeType;

  regionId?: string;
  districtId?: string;
  branchId?: string;
  userId?: string;
  productId?: string;

  targetValue: number;
}

export interface RemoveTargetAssignmentResponse {
  success: boolean;
  message: string;
}