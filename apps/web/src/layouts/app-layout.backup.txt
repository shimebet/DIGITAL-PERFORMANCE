import {
  Box,
  Toolbar,
} from '@mui/material';

import {
  Outlet,
} from 'react-router-dom';

import {
  AppHeader,
} from '../components/navigation/app-header';

import {
  AppSidebar,
  DRAWER_WIDTH,
} from '../components/navigation/app-sidebar';

export function AppLayout() {
  return (
    <Box
      sx={{
        display:
          'flex',

        minHeight:
          '100vh',

        bgcolor:
          'background.default',
      }}
    >
      <AppHeader />

      <AppSidebar />

      <Box
        component="main"
        sx={{
          flexGrow:
            1,

          width: {
            lg:
              `calc(100% - ${DRAWER_WIDTH}px)`,
          },

          minWidth:
            0,

          minHeight:
            '100vh',
        }}
      >
        <Toolbar
          sx={{
            minHeight:
              72,
          }}
        />

        <Outlet />
      </Box>
    </Box>
  );
}