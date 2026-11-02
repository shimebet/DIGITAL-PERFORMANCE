import { useState } from "react";

import {
  AppBar,
  Avatar,
  Box,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from "@mui/material";

import {
  AccountBalanceOutlined,
  LockOutlined,
  LogoutOutlined,
  NotificationsOutlined,
  PersonOutlined,
} from "@mui/icons-material";

import { useNavigate } from "react-router-dom";

import { logoutApi } from "../../api/auth.api";
import { queryClient } from "../../app/query-client";
import { useAuthStore } from "../../stores/auth.store";

export function AndroidAppHeader() {
  const navigate = useNavigate();

  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const hasPermission = useAuthStore((state) => state.hasPermission);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const initials =
    `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`
      .toUpperCase() || "U";

  const fullName = [
    user?.firstName,
    user?.middleName,
    user?.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  function closeMenu() {
    setAnchorEl(null);
  }

  function goTo(path: string) {
    closeMenu();
    navigate(path);
  }

  async function handleLogout() {
    closeMenu();

    try {
      await logoutApi();
    } catch {
      // Network errors must not prevent local logout.
    }

    await queryClient.cancelQueries();

    clearSession();
    queryClient.clear();

    navigate("/login", { replace: true });
  }

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: "background.paper",
        color: "text.primary",
        borderBottom: "1px solid",
        borderColor: "divider",
        pt: "env(safe-area-inset-top, 0px)",
      }}
    >
      <Toolbar
        sx={{
          minHeight: "64px !important",
          px: 2,
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            width: 42,
            height: 42,
            borderRadius: 3,
            bgcolor: "primary.main",
            color: "primary.contrastText",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <AccountBalanceOutlined />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="subtitle1"
            noWrap
            sx={{ fontWeight: 800, lineHeight: 1.3 }}
          >
            CBE Digital Performance
          </Typography>

          <Typography
            variant="caption"
            color="text.secondary"
            noWrap
            sx={{ display: "block" }}
          >
            Monitoring Platform
          </Typography>
        </Box>

        {hasPermission("alert.read") && (
          <IconButton
            aria-label="Alerts"
            onClick={() => navigate("/alerts")}
            sx={{ width: 48, height: 48 }}
          >
            <NotificationsOutlined />
          </IconButton>
        )}

        <IconButton
          aria-label="Account menu"
          onClick={(event) => setAnchorEl(event.currentTarget)}
          sx={{ p: 0.5 }}
        >
          <Avatar
            sx={{
              width: 40,
              height: 40,
              bgcolor: "primary.main",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {initials}
          </Avatar>
        </IconButton>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={closeMenu}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "right",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
slotProps={{
  paper: {
    sx: {
      minWidth: 250,
      maxWidth: "calc(100vw - 24px)",
      borderRadius: 3,
      mt: 1,
    },
  },
}}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
           <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {fullName || "User"}
            </Typography>

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block" }}
            >
              {user?.username}
            </Typography>

            {user?.roles?.[0] && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 0.5 }}
              >
                {user.roles[0]}
              </Typography>
            )}
          </Box>

          <Divider />

          <MenuItem onClick={() => goTo("/profile")}>
            <ListItemIcon>
              <PersonOutlined fontSize="small" />
            </ListItemIcon>
            My Profile
          </MenuItem>

          <MenuItem onClick={() => goTo("/change-password")}>
            <ListItemIcon>
              <LockOutlined fontSize="small" />
            </ListItemIcon>
            Change Password
          </MenuItem>

          <Divider />

          <MenuItem onClick={handleLogout}>
            <ListItemIcon>
              <LogoutOutlined fontSize="small" />
            </ListItemIcon>
            Sign out
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}

