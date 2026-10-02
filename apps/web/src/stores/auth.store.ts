import { create } from 'zustand';

import type {
  AuthUser,
} from '../types/auth.types';

interface StoredSession {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

interface AuthState {
  user: AuthUser | null;

  accessToken: string | null;

  refreshToken: string | null;

  isAuthenticated: boolean;

  initialized: boolean;

  setSession: (
    user: AuthUser,
    accessToken: string,
    refreshToken: string,
  ) => void;

  updateSession: (
    user: AuthUser,
    accessToken: string,
    refreshToken: string,
  ) => void;

  clearSession: () => void;

  hydrate: () => void;

  hasPermission: (
    permission: string,
  ) => boolean;

  hasAnyPermission: (
    permissions: string[],
  ) => boolean;

  hasRole: (
    role: string,
  ) => boolean;

  hasAnyRole: (
    roles: string[],
  ) => boolean;
}

const STORAGE_KEY =
  'dpmp-auth-session';

function saveSession(
  session: StoredSession,
) {
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(session),
  );
}

export const useAuthStore =
  create<AuthState>(
    (set, get) => ({
      user: null,

      accessToken: null,

      refreshToken: null,

      isAuthenticated: false,

      initialized: false,

      setSession: (
        user,
        accessToken,
        refreshToken,
      ) => {
        saveSession({
          user,
          accessToken,
          refreshToken,
        });

        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          initialized: true,
        });
      },

      updateSession: (
        user,
        accessToken,
        refreshToken,
      ) => {
        saveSession({
          user,
          accessToken,
          refreshToken,
        });

        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          initialized: true,
        });
      },

      clearSession: () => {
        sessionStorage.removeItem(
          STORAGE_KEY,
        );

        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          initialized: true,
        });
      },

      hydrate: () => {
        const stored =
          sessionStorage.getItem(
            STORAGE_KEY,
          );

        if (!stored) {
          set({
            initialized: true,
          });

          return;
        }

        try {
          const session =
            JSON.parse(
              stored,
            ) as StoredSession;

          if (
            !session.user ||
            !session.accessToken ||
            !session.refreshToken
          ) {
            throw new Error(
              'Invalid authentication session',
            );
          }

          set({
            user: session.user,
            accessToken:
              session.accessToken,
            refreshToken:
              session.refreshToken,
            isAuthenticated: true,
            initialized: true,
          });
        } catch {
          sessionStorage.removeItem(
            STORAGE_KEY,
          );

          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            initialized: true,
          });
        }
      },

      hasPermission: (
        permission,
      ) => {
        const user =
          get().user;

        if (!user) {
          return false;
        }

        if (
          user.roles.includes(
            'SUPER_ADMIN',
          )
        ) {
          return true;
        }

        return user.permissions.includes(
          permission,
        );
      },

      hasAnyPermission: (
        permissions,
      ) => {
        const user =
          get().user;

        if (!user) {
          return false;
        }

        if (
          user.roles.includes(
            'SUPER_ADMIN',
          )
        ) {
          return true;
        }

        return permissions.some(
          (permission) =>
            user.permissions.includes(
              permission,
            ),
        );
      },

      hasRole: (
        role,
      ) =>
        get().user?.roles.includes(
          role,
        ) ?? false,

      hasAnyRole: (
        roles,
      ) =>
        roles.some(
          (role) =>
            get().user?.roles.includes(
              role,
            ) ?? false,
        ),
    }),
  );