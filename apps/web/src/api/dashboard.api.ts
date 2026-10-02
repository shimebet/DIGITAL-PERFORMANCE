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
  ProductPerformanceRow,
} from '../types/dashboard.types';

function cleanParams(
  query: DashboardQuery,
) {
  return Object.fromEntries(
    Object.entries(
      query,
    ).filter(
      ([, value]) =>
        value !==
          undefined &&
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