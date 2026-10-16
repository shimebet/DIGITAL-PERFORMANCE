
import {
  apiClient,
} from './api-client';

import {
  API_ENDPOINTS,
} from './endpoints';

import type {
  ReportHistoryEntry,
} from '../types/report-history.types';

export async function getReportHistoryApi() {
  const response =
    await apiClient.get<ReportHistoryEntry[]>(
      API_ENDPOINTS.reports.history,
    );

  return response.data;
}
