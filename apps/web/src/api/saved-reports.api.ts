import {
  apiClient,
} from './api-client';

import {
  API_ENDPOINTS,
} from './endpoints';

import type {
  CreateSavedReportInput,
  SavedReport,
  SavedReportRunResult,
  UpdateSavedReportInput,
} from '../types/saved-report.types';

const BASE_URL =
  API_ENDPOINTS.reports.saved;

export async function getSavedReportsApi() {
  const response =
    await apiClient.get<SavedReport[]>(
      BASE_URL,
    );

  return response.data;
}

export async function getSavedReportApi(
  id: string,
) {
  const response =
    await apiClient.get<SavedReport>(
      `${BASE_URL}/${id}`,
    );

  return response.data;
}

export async function createSavedReportApi(
  input: CreateSavedReportInput,
) {
  const response =
    await apiClient.post<SavedReport>(
      BASE_URL,
      input,
    );

  return response.data;
}

export async function updateSavedReportApi(
  id: string,
  input: UpdateSavedReportInput,
) {
  const response =
    await apiClient.patch<SavedReport>(
      `${BASE_URL}/${id}`,
      input,
    );

  return response.data;
}

export async function deleteSavedReportApi(
  id: string,
) {
  const response =
    await apiClient.delete<{
      success: boolean;
    }>(
      `${BASE_URL}/${id}`,
    );

  return response.data;
}

export async function runSavedReportApi(
  id: string,
) {
  const response =
    await apiClient.post<SavedReportRunResult>(
      `${BASE_URL}/${id}/run`,
    );

  return response.data;
}
