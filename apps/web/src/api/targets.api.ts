import { apiClient } from "./api-client";
import { API_ENDPOINTS } from "./endpoints";

import type {
  AssignTargetInput,
  CreateTargetInput,
  RemoveTargetAssignmentResponse,
  Target,
  TargetAssignment,
  UpdateTargetInput,
} from "../types/target.types";


// ============================================================================
// TARGET DEFINITIONS
// ============================================================================

export async function getTargetsApi() {
  const response =
    await apiClient.get<Target[]>(
      API_ENDPOINTS.targets,
    );

  return response.data;
}

export async function getTargetApi(
  targetId: string,
) {
  const response =
    await apiClient.get<Target>(
      `${API_ENDPOINTS.targets}/${targetId}`,
    );

  return response.data;
}

export async function createTargetApi(
  input: CreateTargetInput,
) {
  const response =
    await apiClient.post<Target>(
      API_ENDPOINTS.targets,
      input,
    );

  return response.data;
}

export async function updateTargetApi(
  targetId: string,
  input: UpdateTargetInput,
) {
  const response =
    await apiClient.patch<Target>(
      `${API_ENDPOINTS.targets}/${targetId}`,
      input,
    );

  return response.data;
}

export async function deleteTargetApi(
  targetId: string,
) {
  const response =
    await apiClient.delete<{
      success: boolean;
      message: string;
    }>(
      `${API_ENDPOINTS.targets}/${targetId}`,
    );

  return response.data;
}

// ============================================================================
// TARGET ASSIGNMENTS
// ============================================================================

export async function getTargetAssignmentsApi(
  targetId: string,
) {
  const response =
    await apiClient.get<TargetAssignment[]>(
      `${API_ENDPOINTS.targets}/${targetId}/assignments`,
    );

  return response.data;
}

export async function assignTargetApi(
  input: AssignTargetInput,
) {
  const response =
    await apiClient.post<TargetAssignment>(
      API_ENDPOINTS.targetAssignments,
      input,
    );

  return response.data;
}

export async function removeTargetAssignmentApi(
  assignmentId: string,
) {
  const response =
    await apiClient.delete<RemoveTargetAssignmentResponse>(
      `${API_ENDPOINTS.targetAssignments}/${assignmentId}`,
    );

  return response.data;
}