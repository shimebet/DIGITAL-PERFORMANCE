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

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_URL =
  import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error(
    'VITE_API_URL is not configured',
  );
}

// ============================================================================
// API CLIENT
// ============================================================================

export const apiClient =
  axios.create({
    baseURL:
      API_URL,

    timeout:
      30_000,

    headers: {
      'Content-Type':
        'application/json',
    },
  });

// ============================================================================
// RETRY REQUEST TYPE
// ============================================================================

interface RetryRequestConfig
  extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// ============================================================================
// REQUEST INTERCEPTOR
// ============================================================================

apiClient.interceptors.request.use(
  (
    config,
  ) => {
    const accessToken =
      useAuthStore
        .getState()
        .accessToken;

    if (accessToken) {
      config.headers.Authorization =
        `Bearer ${accessToken}`;
    } else {
      delete config
        .headers
        .Authorization;
    }

    return config;
  },
);

// ============================================================================
// REFRESH COORDINATION
// ============================================================================
//
// Only one refresh request is shared for the SAME refresh token.
//
// If the account changes while a refresh is running, the old refresh response
// is rejected and is NOT allowed to restore the previous session.
// ============================================================================

let refreshPromise:
  | Promise<RefreshResponse>
  | null =
  null;

let refreshPromiseToken:
  | string
  | null =
  null;

async function refreshSession() {
  const initialAuth =
    useAuthStore.getState();

  const refreshToken =
    initialAuth.refreshToken;

  const userId =
    initialAuth.user?.id ??
    null;

  if (
    !refreshToken ||
    !userId ||
    !initialAuth.isAuthenticated
  ) {
    throw new Error(
      'Refresh token is unavailable',
    );
  }

  // --------------------------------------------------------------------------
  // START A NEW REFRESH IF:
  //
  // 1. No refresh is currently running
  // 2. The existing refresh belongs to another session/token
  // --------------------------------------------------------------------------

  if (
    !refreshPromise ||
    refreshPromiseToken !==
      refreshToken
  ) {
    const tokenForRequest =
      refreshToken;

    refreshPromiseToken =
      tokenForRequest;

    const currentPromise =
      axios
        .post<RefreshResponse>(
          `${API_URL}${API_ENDPOINTS.auth.refresh}`,
          {
            refreshToken:
              tokenForRequest,
          },
          {
            headers: {
              'Content-Type':
                'application/json',
            },

            timeout:
              30_000,
          },
        )
        .then(
          (
            response,
          ) =>
            response.data,
        )
        .finally(
          () => {
            // Do not clear a newer account's refresh promise.
            if (
              refreshPromise ===
              currentPromise
            ) {
              refreshPromise =
                null;

              refreshPromiseToken =
                null;
            }
          },
        );

    refreshPromise =
      currentPromise;
  }

  const refreshed =
    await refreshPromise;

  // --------------------------------------------------------------------------
  // SESSION-RACE PROTECTION
  //
  // Logout/account switch may have happened while HTTP refresh was in flight.
  // Never restore the previous session in that case.
  // --------------------------------------------------------------------------

  const currentAuth =
    useAuthStore.getState();

  if (
    !currentAuth.isAuthenticated ||
    currentAuth.user?.id !==
      userId ||
    currentAuth.refreshToken !==
      refreshToken
  ) {
    throw new Error(
      'Authentication session changed during refresh',
    );
  }

  return refreshed;
}

// ============================================================================
// RESPONSE INTERCEPTOR
// ============================================================================

apiClient.interceptors.response.use(
  (
    response,
  ) =>
    response,

  async (
    error: AxiosError,
  ) => {
    const originalRequest =
      error.config as
        | RetryRequestConfig
        | undefined;

    // ------------------------------------------------------------------------
    // ONLY HANDLE 401
    // ------------------------------------------------------------------------

    if (
      !originalRequest ||
      error.response?.status !==
        401
    ) {
      return Promise.reject(
        error,
      );
    }

    const requestUrl =
      originalRequest.url ??
      '';

    // ------------------------------------------------------------------------
    // NEVER REFRESH LOGIN OR REFRESH CALLS
    // ------------------------------------------------------------------------

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

    // ------------------------------------------------------------------------
    // PREVENT RETRY LOOP
    // ------------------------------------------------------------------------

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

    // ------------------------------------------------------------------------
    // REFRESH
    // ------------------------------------------------------------------------

    try {
      const refreshed =
        await refreshSession();

      // ----------------------------------------------------------------------
      // VERIFY SESSION IS STILL THE SAME BEFORE WRITING NEW TOKENS
      // ----------------------------------------------------------------------

      const currentAuth =
        useAuthStore.getState();

      if (
        !currentAuth.isAuthenticated ||
        !currentAuth.user
      ) {
        throw new Error(
          'Authentication session is no longer active',
        );
      }

      currentAuth.updateSession(
        refreshed.user,
        refreshed.accessToken,
        refreshed.refreshToken,
      );

      originalRequest
        .headers
        .Authorization =
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