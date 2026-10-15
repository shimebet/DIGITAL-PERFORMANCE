
import { apiClient } from "./api-client";
import { API_ENDPOINTS } from "./endpoints";

import type {
  User,
  CreateUserPayload,
  UpdateUserPayload,
} from "../types/user.types";

export async function getUsersApi(): Promise<User[]> {
  const response = await apiClient.get<User[]>(
    API_ENDPOINTS.users,
  );

  return response.data;
}

export async function getUserApi(id: string): Promise<User> {
  const response = await apiClient.get<User>(
    `${API_ENDPOINTS.users}/${encodeURIComponent(id)}`,
  );

  return response.data;
}

export async function createUserApi(
  payload: CreateUserPayload,
): Promise<User> {
  const response = await apiClient.post<User>(
    API_ENDPOINTS.users,
    payload,
  );

  return response.data;
}

export async function updateUserApi(
  id: string,
  payload: UpdateUserPayload,
): Promise<User> {
  const response = await apiClient.patch<User>(
    `${API_ENDPOINTS.users}/${encodeURIComponent(id)}`,
    payload,
  );

  return response.data;
}

export async function deleteUserApi(
  id: string,
): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.delete<{
    success: boolean;
    message: string;
  }>(
    `${API_ENDPOINTS.users}/${encodeURIComponent(id)}`,
  );

  return response.data;
}

export interface ResetUserPasswordPayload {
  temporaryPassword: string;
}

export interface UserActionResponse {
  success: boolean;
  message: string;
}

export async function resetUserPasswordApi(
  id: string,
  payload: ResetUserPasswordPayload,
): Promise<UserActionResponse> {
  const response = await apiClient.post<UserActionResponse>(
    `${API_ENDPOINTS.users}/${encodeURIComponent(id)}/reset-password`,
    payload,
  );

  return response.data;
}
