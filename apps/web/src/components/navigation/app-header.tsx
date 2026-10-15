import {
  useState,
} from 'react';

import {
  AppBar,
  Avatar,
  Box,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';

import {
  LockOutlined,
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
  queryClient,
} from '../../app/query-client';

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
      (
        state,
      ) =>
        state.toggleMobileSidebar,
    );

  const user =
    useAuthStore(
      (
        state,
      ) =>
        state.user,
    );

  const clearSession =
    useAuthStore(
      (
        state,
      ) =>
        state.clearSession,
    );

  const [
    anchorEl,
    setAnchorEl,
  ] =
    useState<
      null | HTMLElement
    >(null);

  const menuOpen =
    Boolean(
      anchorEl,
    );

  const initials =
    `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`
      .toUpperCase();

  const fullName =
    [
      user?.firstName,
      user?.middleName,
      user?.lastName,
    ]
      .filter(
        Boolean,
      )
      .join(
        ' ',
      );

  // ==========================================================================
  // LOGOUT
  // ==========================================================================

  async function handleLogout() {
    setAnchorEl(
      null,
    );

    try {
      await logoutApi();
    } catch {
      // A backend/network failure must never prevent local logout.
    }

    await queryClient.cancelQueries();

    clearSession();

    queryClient.clear();

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
            Monitoring &amp; Reporting Platform
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
                1.5,

              minWidth:
                240,
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight:
                  700,
              }}
            >
              {fullName ||
                'User'}
            </Typography>

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display:
                  'block',
              }}
            >
              {user?.username}
            </Typography>

            {user?.roles?.[0] && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display:
                    'block',

                  mt:
                    0.25,
                }}
              >
                {user.roles[0]}
              </Typography>
            )}
          </Box>

          <Divider />

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

            My Profile
          </MenuItem>

          <MenuItem
            onClick={() => {
              setAnchorEl(
                null,
              );

              navigate(
                '/change-password',
              );
            }}
          >
            <LockOutlined
              fontSize="small"
              sx={{
                mr:
                  1.5,
              }}
            />

            Change Password
          </MenuItem>

          <Divider />

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