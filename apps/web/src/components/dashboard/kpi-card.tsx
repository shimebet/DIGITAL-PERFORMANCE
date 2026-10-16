import type { ReactNode } from "react";

import { Box, Card, CardContent, Typography } from "@mui/material";

interface KpiCardProps {
  title: string;

  value: string | number;

  subtitle?: string;

  icon?: ReactNode;
}

export function KpiCard({ title, value, subtitle, icon }: KpiCardProps) {
  return (
    <Card
      elevation={0}
      sx={{
        height: "100%",

        border: "1px solid",

        borderColor: "divider",

        borderRadius: 2.5,

        transition: "transform 0.2s ease, box-shadow 0.2s ease",

        "&:hover": {
          transform: "translateY(-2px)",

          boxShadow: 2,
        },
      }}
    >
      <CardContent
        sx={{
          height: "100%",

          p: 2.25,

          "&:last-child": {
            pb: 2.25,
          },
        }}
      >
        <Box
          sx={{
            height: "100%",

            display: "flex",

            justifyContent: "space-between",

            alignItems: "flex-start",

            gap: 2,
          }}
        >
          <Box
            sx={{
              minWidth: 0,

              flex: 1,
            }}
          >
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                fontWeight: 600,

                lineHeight: 1.3,
              }}
            >
              {title}
            </Typography>

<Typography
  variant="h4"
  sx={{
    mt: 0.75,

    fontWeight: 700,

    lineHeight: 1.15,

    fontSize:
      typeof value === "string" && value.length > 8
        ? "1.25rem"
        : undefined,

    overflowWrap: "normal",

    wordBreak: "normal",

    whiteSpace: "normal",
  }}
>
  {value}
</Typography>

            {subtitle && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: "block",

                  mt: 0.75,

                  lineHeight: 1.35,
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>

          {icon && (
            <Box
              sx={{
                width: 44,

                height: 44,

                flexShrink: 0,

                borderRadius: 2,

                bgcolor: "action.hover",

                color: "primary.main",

                display: "grid",

                placeItems: "center",

                "& svg": {
                  fontSize: 24,
                },
              }}
            >
              {icon}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
