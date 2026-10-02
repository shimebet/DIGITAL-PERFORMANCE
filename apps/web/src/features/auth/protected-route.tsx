import {
  Box,
  CircularProgress,
} from '@mui/material';

import {
  Navigate,
  Outlet,
  useLocation,
} from 'react-router-dom';

import {
  useAuthStore,
} from '../../stores/auth.store';

export function ProtectedRoute() {
  const location =
    useLocation();

  const initialized =
    useAuthStore(
      (state) =>
        state.initialized,
    );

  const isAuthenticated =
    useAuthStore(
      (state) =>
        state.isAuthenticated,
    );

  if (!initialized) {
    return (
      <Box
        sx={{
          minHeight:
            '100vh',

          display:
            'grid',

          placeItems:
            'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from:
            location.pathname,
        }}
      />
    );
  }

  return <Outlet />;
}