import {
  apiClient,
} from './api-client';

import {
  API_ENDPOINTS,
} from './endpoints';

import type {
  PerformanceReport,
  ReportQuery,
} from '../types/report.types';

function cleanParams(
  query: ReportQuery,
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

export async function getPerformanceReportApi(
  query: ReportQuery,
) {
  const response =
    await apiClient.get<PerformanceReport>(
      API_ENDPOINTS.reports.performance,
      {
        params:
          cleanParams(
            query,
          ),
      },
    );

  return response.data;
}

export async function exportPerformanceCsvApi(
  query: ReportQuery,
) {
  const response =
    await apiClient.get<Blob>(
      API_ENDPOINTS.reports.csv,
      {
        params:
          cleanParams(
            query,
          ),

        responseType:
          'blob',
      },
    );

  return response.data;
}

export async function exportPerformanceXlsxApi(
  query: ReportQuery,
) {
  const response =
    await apiClient.get<Blob>(
      API_ENDPOINTS.reports.xlsx,
      {
        params:
          cleanParams(
            query,
          ),

        responseType:
          'blob',
      },
    );

  return response.data;
}