import { apiClient } from "./api-client";

import { API_ENDPOINTS } from "./endpoints";

import type {
  CreateSubmissionRequest,
  DailySubmission,
  ReturnSubmissionRequest,
  SubmissionQuery,
} from "../types/submission.types";

export async function getMySubmissionsApi() {
  const response = await apiClient.get<DailySubmission[]>(
    API_ENDPOINTS.mySubmissions,
  );

  return response.data;
}

export async function getSubmissionsApi(query: SubmissionQuery = {}) {
  const response = await apiClient.get<DailySubmission[]>(
    API_ENDPOINTS.submissions,
    {
      params: {
        regionId: query.regionId || undefined,

        districtId: query.districtId || undefined,

        branchId: query.branchId || undefined,

        staffId: query.staffId || undefined,

        status: query.status || undefined,

        startDate: query.startDate || undefined,

        endDate: query.endDate || undefined,
      },
    },
  );

  return response.data;
}

export async function getSubmissionApi(id: string) {
  const response = await apiClient.get<DailySubmission>(
    `${API_ENDPOINTS.submissions}/${id}`,
  );

  return response.data;
}

export async function createSubmissionApi(payload: CreateSubmissionRequest) {
  const response = await apiClient.post<DailySubmission>(
    API_ENDPOINTS.submissions,
    payload,
  );

  return response.data;
}

export async function submitSubmissionApi(id: string) {
  const response = await apiClient.post<DailySubmission>(
    `${API_ENDPOINTS.submissions}/${id}/submit`,
  );

  return response.data;
}

export async function reviewSubmissionApi(id: string) {
  const response = await apiClient.post<DailySubmission>(
    `${API_ENDPOINTS.submissions}/${id}/review`,
  );

  return response.data;
}

export async function approveSubmissionApi(id: string) {
  const response = await apiClient.post<DailySubmission>(
    `${API_ENDPOINTS.submissions}/${id}/approve`,
  );

  return response.data;
}

export async function returnSubmissionApi(
  id: string,

  payload: ReturnSubmissionRequest,
) {
  const response = await apiClient.post<DailySubmission>(
    `${API_ENDPOINTS.submissions}/${id}/return`,

    payload,
  );

  return response.data;
}
