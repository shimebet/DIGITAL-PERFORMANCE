import {
  Box,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material';

import {
  AccountBalanceOutlined,
} from '@mui/icons-material';

import {
  useTheme,
} from '@mui/material/styles';

import {
  useLocation,
  useNavigate,
} from 'react-router-dom';

import {
  navigationSections,
} from '../../app/navigation';

import {
  useAuthStore,
} from '../../stores/auth.store';

import {
  useUiStore,
} from '../../stores/ui.store';

const DRAWER_WIDTH =
  270;

export function AppSidebar() {
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

  const location =
    useLocation();

  const mobileSidebarOpen =
    useUiStore(
      (state) =>
        state.mobileSidebarOpen,
    );

  const setMobileSidebarOpen =
    useUiStore(
      (state) =>
        state.setMobileSidebarOpen,
    );

  const hasPermission =
    useAuthStore(
      (state) =>
        state.hasPermission,
    );

  const hasAnyRole =
    useAuthStore(
      (state) =>
        state.hasAnyRole,
    );

  function canView(
    permission?: string,
    roles?: string[],
  ) {
    if (
      permission &&
      !hasPermission(
        permission,
      )
    ) {
      return false;
    }

    if (
      roles &&
      roles.length >
        0 &&
      !hasAnyRole(
        roles,
      )
    ) {
      return false;
    }

    return true;
  }

  function handleNavigate(
    path: string,
  ) {
    navigate(
      path,
    );

    if (!isDesktop) {
      setMobileSidebarOpen(
        false,
      );
    }
  }

  const drawerContent = (
    <Box
      sx={{
        height:
          '100%',

        display:
          'flex',

        flexDirection:
          'column',

        bgcolor:
          '#0B4F36',

        color:
          '#FFFFFF',
      }}
    >
      <Toolbar
        sx={{
          minHeight:
            72,

          px:
            2.5,

          gap:
            1.5,
        }}
      >
        <Box
          sx={{
            width:
              40,

            height:
              40,

            borderRadius:
              2,

            bgcolor:
              'rgba(255,255,255,0.12)',

            display:
              'grid',

            placeItems:
              'center',
          }}
        >
          <AccountBalanceOutlined />
        </Box>

        <Box>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight:
                700,

              lineHeight:
                1.2,
            }}
          >
            DPMP
          </Typography>

          <Typography
            variant="caption"
            sx={{
              color:
                'rgba(255,255,255,0.72)',
            }}
          >
            Digital Performance
          </Typography>
        </Box>
      </Toolbar>

      <Divider
        sx={{
          borderColor:
            'rgba(255,255,255,0.10)',
        }}
      />

      <Box
        sx={{
          flex:
            1,

          overflowY:
            'auto',

          py:
            1.5,
        }}
      >
        {navigationSections.map(
          (
            section,
            sectionIndex,
          ) => {
            const visibleItems =
              section.items.filter(
                (
                  item,
                ) =>
                  canView(
                    item.permission,
                    item.roles,
                  ),
              );

            if (
              visibleItems.length ===
              0
            ) {
              return null;
            }

            return (
              <Box
                key={
                  section.label ??
                  sectionIndex
                }
                sx={{
                  mb:
                    1,
                }}
              >
                {section.label && (
                  <Typography
                    variant="overline"
                    sx={{
                      display:
                        'block',

                      px:
                        2.5,

                      py:
                        1,

                      color:
                        'rgba(255,255,255,0.50)',

                      fontWeight:
                        700,

                      letterSpacing:
                        1,
                    }}
                  >
                    {
                      section.label
                    }
                  </Typography>
                )}

                <List
                  disablePadding
                >
                  {visibleItems.map(
                    (
                      item,
                    ) => {
                      const selected =
                        location.pathname ===
                          item.path ||
                        location.pathname.startsWith(
                          `${item.path}/`,
                        );

                      return (
                        <ListItemButton
                          key={
                            item.path
                          }
                          selected={
                            selected
                          }
                          onClick={() =>
                            handleNavigate(
                              item.path,
                            )
                          }
                          sx={{
                            mx:
                              1.25,

                            mb:
                              0.5,

                            borderRadius:
                              2,

                            minHeight:
                              46,

                            color:
                              'rgba(255,255,255,0.82)',

                            '& .MuiListItemIcon-root':
                              {
                                color:
                                  'inherit',
                              },

                            '&.Mui-selected':
                              {
                                bgcolor:
                                  'rgba(255,255,255,0.14)',

                                color:
                                  '#FFFFFF',

                                '&:hover':
                                  {
                                    bgcolor:
                                      'rgba(255,255,255,0.18)',
                                  },
                              },

                            '&:hover':
                              {
                                bgcolor:
                                  'rgba(255,255,255,0.08)',
                              },
                          }}
                        >
                          <ListItemIcon
                            sx={{
                              minWidth:
                                40,
                            }}
                          >
                            {
                              item.icon
                            }
                          </ListItemIcon>

                          <ListItemText
                            primary={
                              item.label
                            }
                          />
                        </ListItemButton>
                      );
                    },
                  )}
                </List>
              </Box>
            );
          },
        )}
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant={
        isDesktop
          ? 'permanent'
          : 'temporary'
      }
      open={
        isDesktop ||
        mobileSidebarOpen
      }
      onClose={() =>
        setMobileSidebarOpen(
          false,
        )
      }
      ModalProps={{
        keepMounted:
          true,
      }}
      sx={{
        width:
          DRAWER_WIDTH,

        flexShrink:
          0,

        '& .MuiDrawer-paper':
          {
            width:
              DRAWER_WIDTH,

            boxSizing:
              'border-box',

            border:
              'none',
          },
      }}
    >
      {drawerContent}
    </Drawer>
  );
}

export {
  DRAWER_WIDTH,
};