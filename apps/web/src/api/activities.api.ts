import {
  apiClient,
} from './api-client';

import {
  API_ENDPOINTS,
} from './endpoints';

import type {
  Activity,
  CreateActivityRequest,
  UpdateActivityRequest,
} from '../types/activity.types';

export async function getMyActivitiesApi() {
  const response =
    await apiClient.get<Activity[]>(
      API_ENDPOINTS.myActivities,
    );

  return response.data;
}

export async function getActivityApi(
  id: string,
) {
  const response =
    await apiClient.get<Activity>(
      `${API_ENDPOINTS.activities}/${id}`,
    );

  return response.data;
}

export async function createActivityApi(
  payload: CreateActivityRequest,
) {
  const response =
    await apiClient.post<Activity>(
      API_ENDPOINTS.activities,
      payload,
    );

  return response.data;
}

export async function updateActivityApi(
  id: string,
  payload: UpdateActivityRequest,
) {
  const response =
    await apiClient.patch<Activity>(
      `${API_ENDPOINTS.activities}/${id}`,
      payload,
    );

  return response.data;
}