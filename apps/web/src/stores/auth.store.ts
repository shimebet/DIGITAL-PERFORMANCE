
import { create } from "zustand";

import type {
  AuthUser,
  AuthRoleAssignment,
} from "../types/auth.types";

// ============================================================================
// TYPES
// ============================================================================

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

  updateUser: (user: AuthUser) => void;

  clearSession: () => void;
  hydrate: () => void;

  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;

  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;

  hasGlobalAdminAccess: () => boolean;

  hasRoleAtScope: (
    role: string,
    scopeType: AuthRoleAssignment["scopeType"],
  ) => boolean;

  hasAnyRoleAtScope: (
    roles: string[],
    scopeType: AuthRoleAssignment["scopeType"],
  ) => boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEY = "dpmp-auth-session";

const GLOBAL_ADMIN_ROLES = [
  "SUPER_ADMIN",
  "SYSTEM_ADMIN",
] as const;

// ============================================================================
// AUTHORIZATION HELPERS
// ============================================================================

function getRoleAssignments(
  user: AuthUser | null,
): AuthRoleAssignment[] {
  if (!user || !Array.isArray(user.roleAssignments)) {
    return [];
  }

  return user.roleAssignments;
}

function isGlobalAdministrator(
  user: AuthUser | null,
): boolean {
  return getRoleAssignments(user).some(
    (assignment) =>
      assignment.scopeType === "GLOBAL" &&
      GLOBAL_ADMIN_ROLES.some(
        (role) => role === assignment.roleCode,
      ),
  );
}

function hasLinkedRoleAtScope(
  user: AuthUser | null,
  role: string,
  scopeType: AuthRoleAssignment["scopeType"],
): boolean {
  return getRoleAssignments(user).some(
    (assignment) =>
      assignment.roleCode === role &&
      assignment.scopeType === scopeType,
  );
}

// ============================================================================
// SESSION STORAGE
// ============================================================================

function saveSession(session: StoredSession): void {
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(session),
  );
}

function removeStoredSession(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

function isStoredSession(value: unknown): value is StoredSession {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const session = value as Partial<StoredSession>;

  return (
    typeof session.accessToken === "string" &&
    session.accessToken.length > 0 &&
    typeof session.refreshToken === "string" &&
    session.refreshToken.length > 0 &&
    typeof session.user === "object" &&
    session.user !== null &&
    typeof session.user.id === "string" &&
    Array.isArray(session.user.roles) &&
    Array.isArray(session.user.permissions)
  );
}

// ============================================================================
// STORE
// ============================================================================

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  initialized: false,

  // ==========================================================================
  // SET SESSION
  // ==========================================================================

  setSession: (user, accessToken, refreshToken) => {
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

  // ==========================================================================
  // UPDATE SESSION
  // ==========================================================================

  updateSession: (user, accessToken, refreshToken) => {
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

  // ==========================================================================
  // UPDATE CURRENT USER PROFILE
  // ==========================================================================

  updateUser: (user) => {
    const state = get();

    if (!state.accessToken || !state.refreshToken) {
      set({ user });
      return;
    }

    saveSession({
      user,
      accessToken: state.accessToken,
      refreshToken: state.refreshToken,
    });

    set({ user });
  },

  // ==========================================================================
  // CLEAR SESSION
  // ==========================================================================

  clearSession: () => {
    removeStoredSession();

    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      initialized: true,
    });
  },

  // ==========================================================================
  // HYDRATE
  // ==========================================================================

  hydrate: () => {
    const stored = sessionStorage.getItem(STORAGE_KEY);

    if (!stored) {
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        initialized: true,
      });

      return;
    }

    try {
      const parsed: unknown = JSON.parse(stored);

      if (!isStoredSession(parsed)) {
        throw new Error("Invalid authentication session");
      }

      set({
        user: parsed.user,
        accessToken: parsed.accessToken,
        refreshToken: parsed.refreshToken,
        isAuthenticated: true,
        initialized: true,
      });
    } catch {
      removeStoredSession();

      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        initialized: true,
      });
    }
  },

  // ==========================================================================
  // PERMISSION HELPERS
  // ==========================================================================

  hasPermission: (permission) => {
    const user = get().user;

    if (!user) {
      return false;
    }

    // Only a GLOBAL SUPER_ADMIN receives the frontend permission bypass.
    // SYSTEM_ADMIN must still have the requested permission.
    const isGlobalSuperAdmin = hasLinkedRoleAtScope(
      user,
      "SUPER_ADMIN",
      "GLOBAL",
    );

    if (isGlobalSuperAdmin) {
      return true;
    }

    return user.permissions.includes(permission);
  },

  hasAnyPermission: (permissions) => {
    const user = get().user;

    if (!user) {
      return false;
    }

    const isGlobalSuperAdmin = hasLinkedRoleAtScope(
      user,
      "SUPER_ADMIN",
      "GLOBAL",
    );

    if (isGlobalSuperAdmin) {
      return true;
    }

    return permissions.some((permission) =>
      user.permissions.includes(permission),
    );
  },

  // ==========================================================================
  // ROLE HELPERS
  // ==========================================================================

  hasRole: (role) => {
    const user = get().user;

    return user?.roles.includes(role) ?? false;
  },

  hasAnyRole: (roles) => {
    const user = get().user;

    if (!user) {
      return false;
    }

    return roles.some((role) => user.roles.includes(role));
  },

  // ==========================================================================
  // GLOBAL ADMINISTRATOR
  // ==========================================================================

  hasGlobalAdminAccess: () => {
    return isGlobalAdministrator(get().user);
  },

  // ==========================================================================
  // ROLE + SCOPE VALIDATION
  // ==========================================================================

  hasRoleAtScope: (role, scopeType) => {
    return hasLinkedRoleAtScope(
      get().user,
      role,
      scopeType,
    );
  },

  hasAnyRoleAtScope: (roles, scopeType) => {
    const user = get().user;

    return roles.some((role) =>
      hasLinkedRoleAtScope(user, role, scopeType),
    );
  },
}));
