import { useState } from "react";

import {
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  Typography,
} from "@mui/material";

import {
  CloseOutlined,
  TuneOutlined,
} from "@mui/icons-material";

import { OrganizationFilter } from "../../filters/organization-filter";

export function AndroidDashboardFilters() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<TuneOutlined />}
        onClick={() => setOpen(true)}
        sx={{
          minHeight: 44,
          borderRadius: 3,
          textTransform: "none",
          fontWeight: 700,
          px: 2,
        }}
      >
        Filters
      </Button>

      <Drawer
        anchor="bottom"
        open={open}
        onClose={() => setOpen(false)}
        slotProps={{
          paper: {
            sx: {
              maxHeight: "90dvh",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              display: "flex",
              flexDirection: "column",
              pb: "env(safe-area-inset-bottom, 0px)",
            },
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2.5,
            py: 2,
          }}
        >
          <Box>
            <Typography
              variant="h6"
              sx={{ fontWeight: 800 }}
            >
              Dashboard Filters
            </Typography>

            <Typography
              variant="caption"
              color="text.secondary"
            >
              Refine your performance overview
            </Typography>
          </Box>

          <IconButton
            aria-label="Close filters"
            onClick={() => setOpen(false)}
          >
            <CloseOutlined />
          </IconButton>
        </Box>

        <Divider />

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            p: 2.5,
          }}
        >
          <OrganizationFilter />
        </Box>

        <Divider />

        <Box sx={{ p: 2 }}>
          <Button
            variant="contained"
            fullWidth
            onClick={() => setOpen(false)}
            sx={{
              minHeight: 48,
              borderRadius: 3,
              textTransform: "none",
              fontWeight: 700,
            }}
          >
            Done
          </Button>
        </Box>
      </Drawer>
    </>
  );
}
