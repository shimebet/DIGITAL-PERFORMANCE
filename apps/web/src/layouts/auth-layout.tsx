import {
  Box,
} from '@mui/material';

import {
  Outlet,
} from 'react-router-dom';

export function AuthLayout() {
  return (
    <Box
      sx={{
        minHeight:
          '100vh',

        display:
          'flex',

        alignItems:
          'center',

        justifyContent:
          'center',

        px: 2,

        py: 4,

        background:
          'linear-gradient(135deg, #E8F4EE 0%, #F5F7F8 55%, #EEF2F0 100%)',
      }}
    >
      <Outlet />
    </Box>
  );
}