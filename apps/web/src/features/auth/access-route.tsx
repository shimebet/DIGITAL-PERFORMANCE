
import type { ReactNode } from "react";

import { Navigate } from "react-router-dom";

import { useAuthStore } from "../../stores/auth.store";

interface AccessRouteProps {
  children: ReactNode;
  permission?: string;
  roles?: string[];
  requireGlobalAdmin?: boolean;
}

export function AccessRoute({
  children,
  permission,
  roles,
  requireGlobalAdmin = false,
}: AccessRouteProps) {
  const user = useAuthStore((state) => state.user);

  const hasPermission = useAuthStore(
    (state) => state.hasPermission,
  );

  const hasAnyRole = useAuthStore(
    (state) => state.hasAnyRole,
  );

  const hasGlobalAdminAccess = useAuthStore(
    (state) => state.hasGlobalAdminAccess,
  );

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (
    requireGlobalAdmin &&
    !hasGlobalAdminAccess()
  ) {
    return <Navigate to="/forbidden" replace />;
  }

  if (
    permission &&
    !hasPermission(permission)
  ) {
    return <Navigate to="/forbidden" replace />;
  }

  if (
    roles?.length &&
    !hasAnyRole(roles)
  ) {
    return <Navigate to="/forbidden" replace />;
  }

  return <>{children}</>;
}
