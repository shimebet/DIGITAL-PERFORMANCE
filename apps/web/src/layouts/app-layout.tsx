import {
  Box,
  Toolbar,
} from "@mui/material";

import {
  Outlet,
} from "react-router-dom";

import {
  AppHeader,
} from "../components/navigation/app-header";

import {
  AppSidebar,
  DRAWER_WIDTH,
} from "../components/navigation/app-sidebar";

import {
  AndroidAppLayout,
} from "./android/android-app-layout";

import {
  isAndroidApp,
} from "../platform/platform";

/**
 * Main application layout selector.
 *
 * Native Android uses its dedicated Material-style layout.
 * Web browsers retain the original DPMP website layout.
 */
export function AppLayout() {
  if (isAndroidApp()) {
    return <AndroidAppLayout />;
  }

  return <WebAppLayout />;
}

/**
 * Original DPMP website layout.
 *
 * Preserved to avoid changing the desktop
 * and mobile browser experience.
 */
function WebAppLayout() {
  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "background.default",
      }}
    >
      <AppHeader />

      <AppSidebar />

      <Box
        component="main"
        sx={{
          flexGrow: 1,

          width: {
            lg: `calc(100% - ${DRAWER_WIDTH}px)`,
          },

          minWidth: 0,
          minHeight: "100vh",
        }}
      >
        <Toolbar
          sx={{
            minHeight: 72,
          }}
        />

        <Outlet />
      </Box>
    </Box>
  );
}
