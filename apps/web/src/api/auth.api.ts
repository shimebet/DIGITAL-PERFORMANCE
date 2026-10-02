import {
  apiClient,
} from './api-client';

import {
  API_ENDPOINTS,
} from './endpoints';

import type {
  AuthUser,
  ChangePasswordRequest,
  LoginRequest,
  LoginResponse,
} from '../types/auth.types';

import type {
  ApiMessageResponse,
} from '../types/api.types';

export async function loginApi(
  payload: LoginRequest,
) {
  const response =
    await apiClient.post<LoginResponse>(
      API_ENDPOINTS.auth.login,
      payload,
    );

  return response.data;
}

export async function getCurrentUserApi() {
  const response =
    await apiClient.get<AuthUser>(
      API_ENDPOINTS.auth.me,
    );

  return response.data;
}

export async function changePasswordApi(
  payload:
    ChangePasswordRequest,
) {
  const response =
    await apiClient.post<ApiMessageResponse>(
      API_ENDPOINTS.auth.changePassword,
      payload,
    );

  return response.data;
}

export async function logoutApi() {
  const response =
    await apiClient.post<ApiMessageResponse>(
      API_ENDPOINTS.auth.logout,
    );

  return response.data;
}