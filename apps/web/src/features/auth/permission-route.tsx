import {
  Navigate,
  Outlet,
} from 'react-router-dom';

import {
  useAuthStore,
} from '../../stores/auth.store';

interface PermissionRouteProps {
  permission: string;
}

export function PermissionRoute({
  permission,
}: PermissionRouteProps) {
  const allowed =
    useAuthStore(
      (state) =>
        state.hasPermission(
          permission,
        ),
    );

  if (!allowed) {
    return (
      <Navigate
        to="/forbidden"
        replace
      />
    );
  }

  return <Outlet />;
}