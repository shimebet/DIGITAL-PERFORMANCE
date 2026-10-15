
import { useState } from "react";
import axios from "axios";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import {
  AddOutlined,
  DeleteOutlined,
  EditOutlined,
  RefreshOutlined,
} from "@mui/icons-material";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { apiClient } from "../api/api-client";
import { API_ENDPOINTS } from "../api/endpoints";
import { getRegionsApi } from "../api/organization.api";

type RegionStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";

interface RegionRecord {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  status: RegionStatus;
  _count?: {
    districts: number;
  };
}

interface RegionForm {
  code: string;
  name: string;
  description: string;
  status: RegionStatus;
}

const emptyForm: RegionForm = {
  code: "",
  name: "",
  description: "",
  status: "ACTIVE",
};

function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;

    if (Array.isArray(message)) {
      return message.join(", ");
    }

    if (typeof message === "string") {
      return message;
    }

    if (error.response?.status === 403) {
      return "You do not have permission to perform this action.";
    }
  }

  return error instanceof Error
    ? error.message
    : "An unexpected error occurred.";
}

export function RegionsPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RegionRecord | null>(null);
  const [form, setForm] = useState<RegionForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const regionsQuery = useQuery({
    queryKey: ["regions"],
    queryFn: getRegionsApi,
  });

  const saveMutation = useMutation({
    mutationFn: async (values: RegionForm) => {
      const payload = {
        code: values.code.trim().toUpperCase(),
        name: values.name.trim(),
        description: values.description.trim(),
      };

      if (editing) {
        await apiClient.patch(
          `${API_ENDPOINTS.regions}/${editing.id}`,
          {
            ...payload,
            status: values.status,
          },
        );
      } else {
        await apiClient.post(API_ENDPOINTS.regions, payload);
      }
    },
    onSuccess: async () => {
      setDialogOpen(false);
      setEditing(null);
      setFormError(null);
      setActionError(null);
      setMessage(
        editing
          ? "Region updated successfully."
          : "Region created successfully.",
      );
      await queryClient.invalidateQueries({
        queryKey: ["regions"],
      });
    },
    onError: (error) => {
      setFormError(errorMessage(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`${API_ENDPOINTS.regions}/${id}`);
    },
    onSuccess: async () => {
      setActionError(null);
      setMessage("Region deleted successfully.");
      await queryClient.invalidateQueries({
        queryKey: ["regions"],
      });
    },
    onError: (error) => {
      setActionError(errorMessage(error));
    },
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setMessage(null);
    setDialogOpen(true);
  }

  function openEdit(region: RegionRecord) {
    setEditing(region);
    setForm({
      code: region.code,
      name: region.name,
      description: region.description ?? "",
      status: region.status,
    });
    setFormError(null);
    setMessage(null);
    setDialogOpen(true);
  }

  function handleSave() {
    const code = form.code.trim();
    const name = form.name.trim();

    if (!code || !name) {
      setFormError("Region code and name are required.");
      return;
    }

    if (code.length > 50 || name.length > 191) {
      setFormError("Code or name exceeds the maximum allowed length.");
      return;
    }

    setFormError(null);
    saveMutation.mutate(form);
  }

  function handleDelete(region: RegionRecord) {
    setMessage(null);
    setActionError(null);

    if ((region._count?.districts ?? 0) > 0) {
      setActionError(
        "This region has districts and cannot be deleted until its active districts are handled.",
      );
      return;
    }

    if (
      window.confirm(
        `Delete region "${region.name}" (${region.code})?`,
      )
    ) {
      deleteMutation.mutate(region.id);
    }
  }

  const regions = (regionsQuery.data ?? []) as RegionRecord[];

  const filteredRegions = regions.filter((region) => {
    const term = search.trim().toLowerCase();

    return (
      region.code.toLowerCase().includes(term) ||
      region.name.toLowerCase().includes(term)
    );
  });

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
<Stack
  direction={{ xs: "column", sm: "row" }}
  spacing={2}
  sx={{
    mb: 3,
    justifyContent: "space-between",
    alignItems: {
      xs: "stretch",
      sm: "center",
    },
  }}
>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Regions Management
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Manage organizational regions, status and district structure.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshOutlined />}
            disabled={regionsQuery.isFetching}
            onClick={() => void regionsQuery.refetch()}
          >
            Refresh
          </Button>

          <Button
            variant="contained"
            startIcon={<AddOutlined />}
            onClick={openCreate}
          >
            Add Region
          </Button>
        </Stack>
      </Stack>

      {message && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setMessage(null)}
        >
          {message}
        </Alert>
      )}

      {actionError && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          onClose={() => setActionError(null)}
        >
          {actionError}
        </Alert>
      )}

      <Card
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
        }}
      >
        <CardContent>
<Stack
  direction={{ xs: "column", sm: "row" }}
  spacing={2}
  sx={{
    mb: 2,
    justifyContent: "space-between",
    alignItems: {
      xs: "stretch",
      sm: "center",
    },
  }}
>
            <Typography variant="h6">
              Regions ({regions.length})
            </Typography>

            <TextField
              size="small"
              label="Search regions"
              placeholder="Code or name"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              sx={{ minWidth: 250 }}
            />
          </Stack>

          {regionsQuery.isLoading ? (
            <Box sx={{ py: 6, textAlign: "center" }}>
              <CircularProgress />
            </Box>
          ) : regionsQuery.isError ? (
            <Alert severity="error">
              {errorMessage(regionsQuery.error)}
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Code</TableCell>
                    <TableCell>Region Name</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Districts</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {filteredRegions.map((region) => (
                    <TableRow key={region.id} hover>
                      <TableCell>
                        <Typography sx={{ fontWeight: 600 }}>
                          {region.code}
                        </Typography>
                      </TableCell>

                      <TableCell>{region.name}</TableCell>

                      <TableCell>
                        {region.description || "-"}
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          label={region.status}
                          color={
                            region.status === "ACTIVE"
                              ? "success"
                              : region.status === "INACTIVE"
                                ? "warning"
                                : "default"
                          }
                        />
                      </TableCell>

                      <TableCell align="right">
                        {region._count?.districts ?? 0}
                      </TableCell>

                      <TableCell align="right">
                        <Tooltip title="Edit Region">
                          <IconButton
                            aria-label={`Edit ${region.name}`}
                            onClick={() => openEdit(region)}
                          >
                            <EditOutlined />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Delete Region">
                          <span>
                            <IconButton
                              color="error"
                              aria-label={`Delete ${region.name}`}
                              disabled={deleteMutation.isPending}
                              onClick={() => handleDelete(region)}
                            >
                              <DeleteOutlined />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}

                  {filteredRegions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography
                          color="text.secondary"
                          sx={{ py: 5 }}
                        >
                          No regions found.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onClose={() => {
          if (!saveMutation.isPending) setDialogOpen(false);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editing ? "Edit Region" : "Add New Region"}
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && (
              <Alert severity="error">{formError}</Alert>
            )}

            <TextField
              label="Region Code"
              required
              fullWidth
              slotProps={{
  htmlInput: {
    maxLength: 50,
  },
}}
              value={form.code}
              onChange={(event) =>
                setForm({
                  ...form,
                  code: event.target.value.toUpperCase(),
                })
              }
            />

            <TextField
              label="Region Name"
              required
              fullWidth
              slotProps={{
  htmlInput: {
    maxLength: 191,
  },
}}
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
            />

            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
            />

            {editing && (
              <TextField
                select
                label="Status"
                fullWidth
                value={form.status}
                onChange={(event) =>
                  setForm({
                    ...form,
                    status: event.target.value as RegionStatus,
                  })
                }
              >
                <MenuItem value="ACTIVE">Active</MenuItem>
                <MenuItem value="INACTIVE">Inactive</MenuItem>
                <MenuItem value="ARCHIVED">Archived</MenuItem>
              </TextField>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            disabled={saveMutation.isPending}
            onClick={() => setDialogOpen(false)}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            disabled={saveMutation.isPending}
            onClick={handleSave}
          >
            {saveMutation.isPending
              ? "Saving..."
              : editing
                ? "Save Changes"
                : "Create Region"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
