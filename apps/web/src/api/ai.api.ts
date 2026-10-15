import {
  apiClient,
} from './api-client';

import {
  API_ENDPOINTS,
} from './endpoints';

import type {
  AiGenerateResponse,
  AiInsight,
  AiManagementQueryResponse,
  AiManagementSummary,
  AiQuery,
} from '../types/ai.types';

// ============================================================================
// CLEAN QUERY PARAMS
// ============================================================================

function cleanParams(
  query: AiQuery,
) {
  return Object.fromEntries(
    Object.entries(
      query,
    ).filter(
      (
        [, value],
      ) =>
        value !==
          undefined &&
        value !==
          '',
    ),
  );
}

// ============================================================================
// GENERATE AI INSIGHTS
// ============================================================================

export async function generateAiInsightsApi(
  query: AiQuery,
) {
  const response =
    await apiClient.post<AiGenerateResponse>(
      API_ENDPOINTS.ai.generate,
      query,
    );

  return response.data;
}

// ============================================================================
// GET STORED AI INSIGHTS
// ============================================================================

export async function getAiInsightsApi(
  query: AiQuery,
) {
  const response =
    await apiClient.get<AiInsight[]>(
      API_ENDPOINTS.ai.insights,
      {
        params:
          cleanParams(
            query,
          ),
      },
    );

  return response.data;
}

// ============================================================================
// MANAGEMENT SUMMARY
// ============================================================================

export async function getAiManagementSummaryApi(
  query: AiQuery,
) {
  const response =
    await apiClient.get<AiManagementSummary>(
      API_ENDPOINTS.ai.summary,
      {
        params:
          cleanParams(
            query,
          ),
      },
    );

  return response.data;
}

// ============================================================================
// MANAGEMENT QUERY
// ============================================================================

export async function submitAiManagementQueryApi(
  question:
    string,

  query:
    AiQuery,
) {
  const response =
    await apiClient.post<AiManagementQueryResponse>(
      API_ENDPOINTS.ai.query,
      {
        question,

        ...query,
      },
    );

  return response.data;
}