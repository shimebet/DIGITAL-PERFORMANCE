import {
  apiClient,
} from './api-client';

import {
  API_ENDPOINTS,
} from './endpoints';

import type {
  BranchPerformanceRow,
  DailyTrendRow,
  DashboardOverview,
  DashboardQuery,
  PerformanceSummary,
  ProductPerformanceRow,
  BranchRankingRow,
StaffRankingRow,
} from '../types/dashboard.types';
import type {
  StaffOption,
} from '../types/staff-option.types';

export async function getStaffOptionsApi(
  branchId: string,
): Promise<StaffOption[]> {
  const response =
    await apiClient.get<StaffOption[]>(
      API_ENDPOINTS.performance.staffOptions,
      {
        params: {
          branchId,
        },
      },
    );

  return response.data;
}
function cleanParams(
  query: DashboardQuery,
) {
  return Object.fromEntries(
    Object.entries(
      query,
    ).filter(
      ([, value]) =>
        value !== undefined &&
        value !== '',
    ),
  );
}

export async function getDashboardOverviewApi(
  query: DashboardQuery,
) {
  const response =
    await apiClient.get<DashboardOverview>(
      API_ENDPOINTS.dashboard.overview,
      {
        params:
          cleanParams(
            query,
          ),
      },
    );

  return response.data;
}

export async function getPerformanceSummaryApi(
  query: DashboardQuery,
) {
  const response =
    await apiClient.get<PerformanceSummary>(
      API_ENDPOINTS.performance.summary,
      {
        params:
          cleanParams(
            query,
          ),
      },
    );

  return response.data;
}

export async function getDailyTrendApi(
  query: DashboardQuery,
) {
  const response =
    await apiClient.get<DailyTrendRow[]>(
      API_ENDPOINTS.performance.dailyTrend,
      {
        params:
          cleanParams(
            query,
          ),
      },
    );

  return response.data;
}

export async function getProductPerformanceApi(
  query: DashboardQuery,
) {
  const response =
    await apiClient.get<ProductPerformanceRow[]>(
      API_ENDPOINTS.performance.products,
      {
        params:
          cleanParams(
            query,
          ),
      },
    );

  return response.data;
}

export async function getBranchPerformanceApi(
  query: DashboardQuery,
) {
  const response =
    await apiClient.get<BranchPerformanceRow[]>(
      API_ENDPOINTS.dashboard.branches,
      {
        params:
          cleanParams(
            query,
          ),
      },
    );

  return response.data;
}

export async function getBranchRankingApi(
  query: DashboardQuery,
) {
  const response =
    await apiClient.get<BranchRankingRow[]>(
      API_ENDPOINTS.performance.branchRanking,
      {
        params: cleanParams(query),
      },
    );

  return response.data;
}

export async function getStaffRankingApi(
  query: DashboardQuery,
) {
  const response =
    await apiClient.get<StaffRankingRow[]>(
      API_ENDPOINTS.performance.staffRanking,
      {
        params: cleanParams(query),
      },
    );

  return response.data;
}