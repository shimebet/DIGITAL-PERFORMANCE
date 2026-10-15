import {
  apiClient,
} from './api-client';

import {
  API_ENDPOINTS,
} from './endpoints';

import type {
  AlertDetectionResult,
  AlertQuery,
  AlertRecord,
} from '../types/alert.types';

function cleanParams(
  query: AlertQuery,
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

export async function getAlertsApi(
  query: AlertQuery = {},
) {
  const response =
    await apiClient.get<
      AlertRecord[]
    >(
      API_ENDPOINTS.alerts,
      {
        params:
          cleanParams(
            query,
          ),
      },
    );

  return response.data;
}

export async function getAlertByIdApi(
  id: string,
) {
  const response =
    await apiClient.get<
      AlertRecord
    >(
      `${API_ENDPOINTS.alerts}/${id}`,
    );

  return response.data;
}

export async function acknowledgeAlertApi(
  id: string,
) {
  const response =
    await apiClient.patch<
      AlertRecord
    >(
      `${API_ENDPOINTS.alerts}/${id}/acknowledge`,
    );

  return response.data;
}

export async function resolveAlertApi(
  id: string,
) {
  const response =
    await apiClient.patch<
      AlertRecord
    >(
      `${API_ENDPOINTS.alerts}/${id}/resolve`,
    );

  return response.data;
}

export async function detectAlertsApi() {
  const response =
    await apiClient.post<
      AlertDetectionResult
    >(
      `${API_ENDPOINTS.alerts}/detect`,
    );

  return response.data;
}