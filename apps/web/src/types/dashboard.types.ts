export interface DashboardQuery {
  startDate?: string;
  endDate?: string;

  regionId?: string;
  districtId?: string;
  branchId?: string;
  staffId?: string;
  productId?: string;
}

export interface PerformanceSummary {
  period: {
    startDate: string;
    endDate: string;
  };

  target: number;

  activity: {
    customerVisits: number;
    phoneCalls: number;
    customersContacted: number;
    customersEducated: number;
    productCustomersEngaged?: number | null;
  };

  conversion: {
    rate: number;
    denominator?: 'CUSTOMERS_ENGAGED' | 'CUSTOMERS_EDUCATED';
  };

  activation: {
    activations: number;
    reactivations: number;
  };

  transaction: {
    transactions: number;
    conversionRate: number;
  };

  achievement: {
    value: number;
    target: number;
    percentage: number;
  };

  activityCount: number;
}

export type PerformanceStatus =
  | 'ACHIEVED'
  | 'ON_TRACK'
  | 'NEEDS_ATTENTION'
  | 'CRITICAL'
  | 'NO_TARGET';

export interface BranchRankingRow {
  rank: number;

  branchId: string;
  branchCode: string;
  branchName: string;

  districtId: string;
  districtName: string;

  regionId: string;
  regionName: string;

  target: number;

  customerVisits: number;
  customersEducated: number;

  activations: number;
  transactions: number;

  conversionRate: number;
  transactionConversionRate: number;

  achievementRate: number;
  remainingTarget: number;

  activityCount: number;

  status: PerformanceStatus;
}

export interface StaffRankingRow {
  rank: number;

  staffId: string;
  employeeNumber: string;

  firstName: string;
  middleName: string | null;
  lastName: string;

  branchId: string;
  branchCode: string;
  branchName: string;

  districtId: string;
  districtName: string;

  regionId: string;
  regionName: string;

  target: number;

  customerVisits: number;
  customersEducated: number;

  activations: number;
  reactivations: number;
  transactions: number;

  conversionRate: number;
  transactionConversionRate: number;

  achievementRate: number;
  remainingTarget: number;

  activityCount: number;

  status: PerformanceStatus;
}

export interface SubmissionSummary {
  total: number;
  draft: number;
  submitted: number;
  resubmitted: number;
  reviewed: number;
  approved: number;
  returned: number;
  rejected: number;
}

export interface FollowUpSummary {
  total: number;
  open: number;
  contacted: number;
  rescheduled: number;
  converted: number;
  notInterested: number;
  unreachable: number;
  closed: number;
  overdue: number;
}

export interface DashboardOverview {
  performance: PerformanceSummary;
  submissions: SubmissionSummary;
  followUps: FollowUpSummary;
}

export interface DailyTrendRow {
  date: string;
  customerVisits: number;
  customersContacted: number;
  customersEducated: number;
  activations: number;
  reactivations: number;
  transactions: number;
  conversionRate: number;
  transactionRate: number;
}

export interface ProductPerformanceRow {
  productId: string;
  code: string;
  name: string;
  customersEngaged: number;
  activations: number;
  reactivations: number;
  transactions: number;
  conversionRate: number;
  transactionRate: number;
}

export interface BranchPerformanceRow {
  branchId: string;
  branchCode: string;
  branchName: string;
  districtName: string;
  regionName: string;
  target: number;
  activations: number;
  transactions: number;
  conversionRate: number;
  achievementRate: number;
}