import {
  useState,
} from 'react';

import {
  AppBar,
  Avatar,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';

import {
  LogoutOutlined,
  MenuOutlined,
  NotificationsOutlined,
  PersonOutlined,
} from '@mui/icons-material';

import {
  useTheme,
} from '@mui/material/styles';

import {
  useNavigate,
} from 'react-router-dom';

import {
  logoutApi,
} from '../../api/auth.api';

import {
  useAuthStore,
} from '../../stores/auth.store';

import {
  useUiStore,
} from '../../stores/ui.store';

import {
  DRAWER_WIDTH,
} from './app-sidebar';

export function AppHeader() {
  const theme =
    useTheme();

  const isDesktop =
    useMediaQuery(
      theme.breakpoints.up(
        'lg',
      ),
    );

  const navigate =
    useNavigate();

  const toggleMobileSidebar =
    useUiStore(
      (state) =>
        state.toggleMobileSidebar,
    );

  const user =
    useAuthStore(
      (state) =>
        state.user,
    );

  const clearSession =
    useAuthStore(
      (state) =>
        state.clearSession,
    );

  const [
    anchorEl,
    setAnchorEl,
  ] =
    useState<null | HTMLElement>(
      null,
    );

  const menuOpen =
    Boolean(
      anchorEl,
    );

  const initials =
    `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();

  async function handleLogout() {
    setAnchorEl(
      null,
    );

    try {
      await logoutApi();
    } catch {
      // Local session must still be cleared
      // when the API logout request fails.
    }

    clearSession();

    navigate(
      '/login',
      {
        replace:
          true,
      },
    );
  }

  return (
    <AppBar
      position="fixed"
      color="inherit"
      elevation={0}
      sx={{
        width: {
          lg:
            `calc(100% - ${DRAWER_WIDTH}px)`,
        },

        ml: {
          lg:
            `${DRAWER_WIDTH}px`,
        },

        borderBottom:
          '1px solid',

        borderColor:
          'divider',

        bgcolor:
          'rgba(255,255,255,0.96)',

        backdropFilter:
          'blur(10px)',
      }}
    >
      <Toolbar
        sx={{
          minHeight:
            72,

          px: {
            xs:
              2,

            md:
              3,
          },
        }}
      >
        {!isDesktop && (
          <IconButton
            edge="start"
            onClick={
              toggleMobileSidebar
            }
            sx={{
              mr:
                1,
            }}
          >
            <MenuOutlined />
          </IconButton>
        )}

        <Box
          sx={{
            flex:
              1,
          }}
        >
          <Typography
            variant="h6"
          >
            Digital Performance
          </Typography>

          <Typography
            variant="caption"
            color="text.secondary"
          >
            Monitoring &
            Reporting Platform
          </Typography>
        </Box>

        <Tooltip
          title="Alerts"
        >
          <IconButton
            onClick={() =>
              navigate(
                '/alerts',
              )
            }
          >
            <NotificationsOutlined />
          </IconButton>
        </Tooltip>

        <Tooltip
          title="Account"
        >
          <IconButton
            onClick={(
              event,
            ) =>
              setAnchorEl(
                event.currentTarget,
              )
            }
            sx={{
              ml:
                1,
            }}
          >
            <Avatar
              sx={{
                width:
                  38,

                height:
                  38,

                bgcolor:
                  'primary.main',

                fontSize:
                  14,

                fontWeight:
                  700,
              }}
            >
              {initials ||
                'U'}
            </Avatar>
          </IconButton>
        </Tooltip>

        <Menu
          anchorEl={
            anchorEl
          }
          open={
            menuOpen
          }
          onClose={() =>
            setAnchorEl(
              null,
            )
          }
          anchorOrigin={{
            vertical:
              'bottom',

            horizontal:
              'right',
          }}
          transformOrigin={{
            vertical:
              'top',

            horizontal:
              'right',
          }}
        >
          <Box
            sx={{
              px:
                2,

              py:
                1.25,

              minWidth:
                220,
            }}
          >
            <Typography
              variant="subtitle2"
            >
              {user?.firstName}{' '}
              {user?.lastName}
            </Typography>

            <Typography
              variant="caption"
              color="text.secondary"
            >
              {user?.username}
            </Typography>
          </Box>

          <MenuItem
            onClick={() => {
              setAnchorEl(
                null,
              );

              navigate(
                '/profile',
              );
            }}
          >
            <PersonOutlined
              fontSize="small"
              sx={{
                mr:
                  1.5,
              }}
            />

            Profile
          </MenuItem>

          <MenuItem
            onClick={
              handleLogout
            }
          >
            <LogoutOutlined
              fontSize="small"
              sx={{
                mr:
                  1.5,
              }}
            />

            Sign out
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}