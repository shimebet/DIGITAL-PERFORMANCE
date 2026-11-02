import type { ReactNode } from "react";

import {
  Box,
  Typography,
} from "@mui/material";

interface AndroidKpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
}

export function AndroidKpiCard({
  title,
  value,
  subtitle,
  icon,
}: AndroidKpiCardProps) {
  return (
    <Box
      sx={{
        minWidth: 0,
        height: "100%",
        p: 2,
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 3,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            fontWeight: 600,
            lineHeight: 1.4,
          }}
        >
          {title}
        </Typography>

        <Box
          sx={{
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            width: 32,
            height: 32,
            borderRadius: 2,
            bgcolor: "action.hover",
            color: "primary.main",
            "& svg": {
              fontSize: 19,
            },
          }}
        >
          {icon}
        </Box>
      </Box>

      <Typography
        variant="h5"
        sx={{
          fontWeight: 800,
          letterSpacing: "-0.03em",
          overflowWrap: "anywhere",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {typeof value === "number"
          ? value.toLocaleString()
          : value}
      </Typography>

      {subtitle && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            lineHeight: 1.4,
            mt: "auto",
          }}
        >
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}
