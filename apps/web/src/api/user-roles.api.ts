import { apiClient } from "./api-client";
import { API_ENDPOINTS } from "./endpoints";

import type { ScopeType } from "../types/auth.types";
import type { UserRoleAssignment } from "../types/user.types";

export interface AssignUserRolePayload {
  userId: string;
  roleId: string;
  scopeType: ScopeType;
  regionId?: string;
  districtId?: string;
  branchId?: string;
}

export async function getUserRolesApi(
  userId: string,
): Promise<UserRoleAssignment[]> {
  const response = await apiClient.get<UserRoleAssignment[]>(
    `${API_ENDPOINTS.userRoles}/user/${encodeURIComponent(userId)}`,
  );

  return response.data;
}

export async function assignUserRoleApi(
  payload: AssignUserRolePayload,
): Promise<UserRoleAssignment> {
  const response = await apiClient.post<UserRoleAssignment>(
    API_ENDPOINTS.userRoles,
    payload,
  );

  return response.data;
}

export async function removeUserRoleApi(
  assignmentId: string,
): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.delete<{
    success: boolean;
    message: string;
  }>(
    `${API_ENDPOINTS.userRoles}/${encodeURIComponent(assignmentId)}`,
  );

  return response.data;
}