import { useState } from "react";

import {
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";

import { MoreHorizOutlined } from "@mui/icons-material";

import { useLocation, useNavigate } from "react-router-dom";

import {
  navigationSections,
  type NavigationItem,
} from "../../app/navigation";

import { useAuthStore } from "../../stores/auth.store";

const PRIMARY_PATHS = [
  "/dashboard",
  "/activities",
  "/targets",
  "/reports",
];

export function AndroidNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const [moreOpen, setMoreOpen] = useState(false);

  const hasPermission = useAuthStore(
    (state) => state.hasPermission,
  );

  const hasAnyRole = useAuthStore(
    (state) => state.hasAnyRole,
  );

  function canView(item: NavigationItem) {
    if (item.permission && !hasPermission(item.permission)) {
      return false;
    }

    if (item.roles?.length && !hasAnyRole(item.roles)) {
      return false;
    }

    return true;
  }

  const visibleSections = navigationSections
    .map((section) => ({
      ...section,
      items: section.items.filter(canView),
    }))
    .filter((section) => section.items.length > 0);

  const visibleItems = visibleSections.flatMap(
    (section) => section.items,
  );

  const primaryItems = PRIMARY_PATHS
    .map((path) =>
      visibleItems.find((item) => item.path === path),
    )
    .filter((item): item is NavigationItem => Boolean(item));

  const activePrimary = primaryItems.find(
    (item) =>
      location.pathname === item.path ||
      location.pathname.startsWith(`${item.path}/`),
  );

  function goTo(path: string) {
    setMoreOpen(false);
    navigate(path);
  }

  return (
    <>
      <Box
        component="nav"
        aria-label="Android primary navigation"
        sx={{
          position: "sticky",
          bottom: 0,
          zIndex: (theme) => theme.zIndex.appBar,
          bgcolor: "background.paper",
          borderTop: "1px solid",
          borderColor: "divider",
          pb: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <BottomNavigation
          showLabels
          value={activePrimary?.path ?? "more"}
          sx={{
            height: 72,
            bgcolor: "transparent",
            "& .MuiBottomNavigationAction-root": {
              minWidth: 0,
              px: 0.5,
              color: "#9C4D9C",
              "& .MuiSvgIcon-root": {
                color: "inherit",
              },
            },
            "& .MuiBottomNavigationAction-label": {
              fontSize: "0.68rem",
            },
            "& .MuiBottomNavigationAction-root.Mui-selected": {
              color: "#800080",
              "& .MuiBottomNavigationAction-label": {
                fontWeight: 700,
              },
            },
          }}
        >
          {primaryItems.map((item) => (
            <BottomNavigationAction
              key={item.path}
              value={item.path}
              label={item.label}
              icon={item.icon}
              onClick={() => goTo(item.path)}
            />
          ))}

          <BottomNavigationAction
            value="more"
            label="More"
            icon={<MoreHorizOutlined />}
            onClick={() => setMoreOpen(true)}
          />
        </BottomNavigation>
      </Box>

      <Drawer
        anchor="bottom"
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        slotProps={{
          paper: {
            sx: {
              maxHeight: "85dvh",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              pb: "env(safe-area-inset-bottom, 0px)",
            },
          },
        }}
      >
        <Box sx={{ px: 3, pt: 2.5, pb: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 4,
              borderRadius: 2,
              bgcolor: "divider",
              mx: "auto",
              mb: 2,
            }}
          />

          <Typography
            variant="h6"
            sx={{ fontWeight: 700 }}
          >
            All Modules
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
          >
            Your available DPMP features
          </Typography>
        </Box>

        <Divider />

        <Box sx={{ overflowY: "auto", flex: 1, py: 1 }}>
          {visibleSections.map((section, index) => (
            <Box key={section.label ?? index}>
              {section.label && (
                <Typography
                  variant="overline"
                  sx={{
                    display: "block",
                    px: 3,
                    pt: 2,
                    pb: 0.5,
                    color: "text.secondary",
                    fontWeight: 700,
                  }}
                >
                  {section.label}
                </Typography>
              )}

              <List disablePadding>
                {section.items.map((item) => {
                  const selected =
                    location.pathname === item.path ||
                    location.pathname.startsWith(
                      `${item.path}/`,
                    );

                  return (
                    <ListItemButton
                      key={item.path}
                      selected={selected}
                      onClick={() => goTo(item.path)}
                      sx={{
                        mx: 1.5,
                        borderRadius: 2,
                        minHeight: 52,
                      }}
                    >
                      <ListItemIcon
                        sx={{ minWidth: 44 }}
                      >
                        {item.icon}
                      </ListItemIcon>

                      <ListItemText primary={item.label} />
                    </ListItemButton>
                  );
                })}
              </List>
            </Box>
          ))}
        </Box>
      </Drawer>
    </>
  );
}

