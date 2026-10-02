import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';

import {
  useAuthStore,
} from '../stores/auth.store';

import type {
  RefreshResponse,
} from '../types/auth.types';

import {
  API_ENDPOINTS,
} from './endpoints';

const API_URL =
  import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error(
    'VITE_API_URL is not configured',
  );
}

export const apiClient =
  axios.create({
    baseURL: API_URL,

    timeout: 30_000,

    headers: {
      'Content-Type':
        'application/json',
    },
  });

interface RetryRequestConfig
  extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

apiClient.interceptors.request.use(
  (config) => {
    const accessToken =
      useAuthStore
        .getState()
        .accessToken;

    if (accessToken) {
      config.headers.Authorization =
        `Bearer ${accessToken}`;
    }

    return config;
  },
);

let refreshPromise:
  | Promise<RefreshResponse>
  | null = null;

async function refreshSession() {
  const auth =
    useAuthStore.getState();

  if (!auth.refreshToken) {
    throw new Error(
      'Refresh token is unavailable',
    );
  }

  if (!refreshPromise) {
    refreshPromise =
      axios
        .post<RefreshResponse>(
          `${API_URL}${API_ENDPOINTS.auth.refresh}`,
          {
            refreshToken:
              auth.refreshToken,
          },
          {
            headers: {
              'Content-Type':
                'application/json',
            },
          },
        )
        .then(
          (response) =>
            response.data,
        )
        .finally(() => {
          refreshPromise =
            null;
        });
  }

  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => response,

  async (
    error: AxiosError,
  ) => {
    const originalRequest =
      error.config as
        | RetryRequestConfig
        | undefined;

    if (
      !originalRequest ||
      error.response?.status !== 401
    ) {
      return Promise.reject(
        error,
      );
    }

    const requestUrl =
      originalRequest.url ?? '';

    if (
      requestUrl.includes(
        API_ENDPOINTS.auth.login,
      ) ||
      requestUrl.includes(
        API_ENDPOINTS.auth.refresh,
      )
    ) {
      return Promise.reject(
        error,
      );
    }

    if (
      originalRequest._retry
    ) {
      useAuthStore
        .getState()
        .clearSession();

      return Promise.reject(
        error,
      );
    }

    originalRequest._retry =
      true;

    try {
      const refreshed =
        await refreshSession();

      useAuthStore
        .getState()
        .updateSession(
          refreshed.user,
          refreshed.accessToken,
          refreshed.refreshToken,
        );

      originalRequest.headers.Authorization =
        `Bearer ${refreshed.accessToken}`;

      return apiClient(
        originalRequest,
      );
    } catch (
      refreshError
    ) {
      useAuthStore
        .getState()
        .clearSession();

      return Promise.reject(
        refreshError,
      );
    }
  },
);