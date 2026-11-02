import { Box } from "@mui/material";
import { Outlet } from "react-router-dom";

import { AndroidAppHeader } from "./android-app-header";
import { AndroidNavigation } from "./android-navigation";

/**
 * Native Android layout.
 *
 * Uses the existing protected React Router pages,
 * authentication, permissions and API services.
 */
export function AndroidAppLayout() {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        bgcolor: "background.default",
        overflow: "hidden",
      }}
    >
      <AndroidAppHeader />

      <Box
        component="main"
        sx={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          width: "100%",
          overflowX: "hidden",
          overflowY: "auto",
          overscrollBehaviorY: "contain",
        }}
      >
        <Outlet />
      </Box>

      <AndroidNavigation />
    </Box>
  );
}
