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
  UpdateMyProfileRequest,
} from '../types/auth.types';

import type {
  ApiMessageResponse,
} from '../types/api.types';

// ============================================================================
// LOGIN
// ============================================================================

export async function loginApi(
  payload:
    LoginRequest,
) {
  const response =
    await apiClient.post<LoginResponse>(
      API_ENDPOINTS.auth.login,
      payload,
    );

  return response.data;
}

// ============================================================================
// CURRENT USER
// ============================================================================

export async function getCurrentUserApi() {
  const response =
    await apiClient.get<AuthUser>(
      API_ENDPOINTS.auth.me,
    );

  return response.data;
}

// ============================================================================
// UPDATE CURRENT USER PROFILE
// ============================================================================

export async function updateMyProfileApi(
  payload:
    UpdateMyProfileRequest,
) {
  const response =
    await apiClient.patch<AuthUser>(
      API_ENDPOINTS.auth.me,
      payload,
    );

  return response.data;
}

// ============================================================================
// CHANGE PASSWORD
// ============================================================================

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

// ============================================================================
// LOGOUT
// ============================================================================

export async function logoutApi() {
  const response =
    await apiClient.post<ApiMessageResponse>(
      API_ENDPOINTS.auth.logout,
    );

  return response.data;
}