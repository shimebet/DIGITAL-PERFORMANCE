import {
  apiClient,
} from './api-client';

import {
  API_ENDPOINTS,
} from './endpoints';

import type {
  Branch,
  District,
  Region,
} from '../types/organization.types';

export async function getRegionsApi() {
  const response =
    await apiClient.get<Region[]>(
      API_ENDPOINTS.regions,
    );

  return response.data;
}

export async function getDistrictsApi(
  regionId?: string,
) {
  const response =
    await apiClient.get<District[]>(
      API_ENDPOINTS.districts,
      {
        params:
          regionId
            ? {
                regionId,
              }
            : undefined,
      },
    );

  return response.data;
}

export async function getBranchesApi(
  districtId?: string,
) {
  const response =
    await apiClient.get<Branch[]>(
      API_ENDPOINTS.branches,
      {
        params:
          districtId
            ? {
                districtId,
              }
            : undefined,
      },
    );

  return response.data;
}