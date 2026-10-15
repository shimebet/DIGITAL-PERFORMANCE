
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

import {
  getDistrictsApi,
  getRegionsApi,
} from "../api/organization.api";

import type {
  District,
  Region,
} from "../types/organization.types";

type RecordStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";

interface DistrictRecord extends District {
  description?: string | null;
  region?: Region | null;
  _count?: {
    branches: number;
  };
}

interface DistrictForm {
  regionId: string;
  code: string;
  name: string;
  description: string;
  status: RecordStatus;
}

const emptyForm: DistrictForm = {
  regionId: "",
  code: "",
  name: "",
  description: "",
  status: "ACTIVE",
};

function getErrorMessage(error: unknown): string {
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

export function DistrictsPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DistrictRecord | null>(null);
  const [form, setForm] = useState<DistrictForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const regionsQuery = useQuery({
    queryKey: ["regions"],
    queryFn: getRegionsApi,
  });

  const districtsQuery = useQuery({
    queryKey: ["districts", regionFilter],
    queryFn: () => getDistrictsApi(regionFilter || undefined),
  });

  const regions = regionsQuery.data ?? [];
  const districts = (districtsQuery.data ?? []) as DistrictRecord[];

  const regionById = new Map(
    regions.map((region) => [region.id, region]),
  );

  const filteredDistricts = districts.filter((district) => {
    const term = search.trim().toLowerCase();
    const regionName =
      district.region?.name ??
      regionById.get(district.regionId)?.name ??
      "";

    return (
      district.code.toLowerCase().includes(term) ||
      district.name.toLowerCase().includes(term) ||
      regionName.toLowerCase().includes(term)
    );
  });

  async function refreshOrganization() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["districts"] }),
      queryClient.invalidateQueries({ queryKey: ["regions"] }),
      queryClient.invalidateQueries({ queryKey: ["branches"] }),
    ]);
  }

  const saveMutation = useMutation({
    mutationFn: async (values: DistrictForm) => {
      const payload = {
        regionId: values.regionId,
        code: values.code.trim().toUpperCase(),
        name: values.name.trim(),
        description: values.description.trim(),
      };

      if (editing) {
        await apiClient.patch(
          `${API_ENDPOINTS.districts}/${editing.id}`,
          {
            ...payload,
            status: values.status,
          },
        );
      } else {
        await apiClient.post(API_ENDPOINTS.districts, payload);
      }
    },
    onSuccess: async () => {
      const wasEditing = editing !== null;

      setDialogOpen(false);
      setEditing(null);
      setFormError(null);
      setActionError(null);

      setMessage(
        wasEditing
          ? "District updated successfully."
          : "District created successfully.",
      );

      await refreshOrganization();
    },
    onError: (error) => {
      setFormError(getErrorMessage(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`${API_ENDPOINTS.districts}/${id}`);
    },
    onSuccess: async () => {
      setActionError(null);
      setMessage("District deleted successfully.");
      await refreshOrganization();
    },
    onError: (error) => {
      setActionError(getErrorMessage(error));
    },
  });

  function openCreate() {
    setEditing(null);
    setForm({
      ...emptyForm,
      regionId: regionFilter,
    });
    setFormError(null);
    setActionError(null);
    setMessage(null);
    setDialogOpen(true);
  }

  function openEdit(district: DistrictRecord) {
    setEditing(district);
    setForm({
      regionId: district.regionId,
      code: district.code,
      name: district.name,
      description: district.description ?? "",
      status: district.status as RecordStatus,
    });
    setFormError(null);
    setActionError(null);
    setMessage(null);
    setDialogOpen(true);
  }

  function handleSave() {
    if (!form.regionId) {
      setFormError("Please select a parent region.");
      return;
    }

    if (!form.code.trim() || !form.name.trim()) {
      setFormError("District code and name are required.");
      return;
    }

    if (
      form.code.trim().length > 50 ||
      form.name.trim().length > 191
    ) {
      setFormError("Code or name exceeds the allowed length.");
      return;
    }

    setFormError(null);
    saveMutation.mutate(form);
  }

  function handleDelete(district: DistrictRecord) {
    setMessage(null);
    setActionError(null);

    if ((district._count?.branches ?? 0) > 0) {
      setActionError(
        "This district has branches. Resolve its branch dependencies before deletion.",
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete district "${district.name}" (${district.code})?`,
    );

    if (confirmed) {
      deleteMutation.mutate(district.id);
    }
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "stretch", sm: "center" },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Districts Management
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Manage districts and their relationships to regions.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshOutlined />}
            disabled={districtsQuery.isFetching}
            onClick={() => void refreshOrganization()}
          >
            Refresh
          </Button>

          <Button
            variant="contained"
            startIcon={<AddOutlined />}
            onClick={openCreate}
          >
            Add District
          </Button>
        </Stack>
      </Box>

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
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              justifyContent: "space-between",
              alignItems: { xs: "stretch", md: "center" },
              gap: 2,
              mb: 2,
            }}
          >
            <Typography variant="h6">
              Districts ({districts.length})
            </Typography>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
            >
              <TextField
                select
                size="small"
                label="Filter by Region"
                value={regionFilter}
                onChange={(event) =>
                  setRegionFilter(event.target.value)
                }
                sx={{ minWidth: 220 }}
              >
                <MenuItem value="">All Regions</MenuItem>

                {regions.map((region) => (
                  <MenuItem key={region.id} value={region.id}>
                    {region.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                size="small"
                label="Search Districts"
                placeholder="Code, name or region"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                sx={{ minWidth: 240 }}
              />
            </Stack>
          </Box>

          {regionsQuery.isError && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Unable to load region names:{" "}
              {getErrorMessage(regionsQuery.error)}
            </Alert>
          )}

          {districtsQuery.isLoading ? (
            <Box sx={{ py: 6, textAlign: "center" }}>
              <CircularProgress />
            </Box>
          ) : districtsQuery.isError ? (
            <Alert severity="error">
              {getErrorMessage(districtsQuery.error)}
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Code</TableCell>
                    <TableCell>District Name</TableCell>
                    <TableCell>Region</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Branches</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {filteredDistricts.map((district) => (
                    <TableRow key={district.id} hover>
                      <TableCell>
                        <Typography sx={{ fontWeight: 600 }}>
                          {district.code}
                        </Typography>
                      </TableCell>

                      <TableCell>{district.name}</TableCell>

                      <TableCell>
                        {district.region?.name ??
                          regionById.get(district.regionId)?.name ??
                          district.regionId}
                      </TableCell>

                      <TableCell>
                        {district.description || "-"}
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          label={district.status}
                          color={
                            district.status === "ACTIVE"
                              ? "success"
                              : district.status === "INACTIVE"
                                ? "warning"
                                : "default"
                          }
                        />
                      </TableCell>

                      <TableCell align="right">
                        {district._count?.branches ?? "-"}
                      </TableCell>

                      <TableCell align="right">
                        <Tooltip title="Edit District">
                          <IconButton
                            aria-label={`Edit ${district.name}`}
                            onClick={() => openEdit(district)}
                          >
                            <EditOutlined />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Delete District">
                          <span>
                            <IconButton
                              color="error"
                              aria-label={`Delete ${district.name}`}
                              disabled={deleteMutation.isPending}
                              onClick={() => handleDelete(district)}
                            >
                              <DeleteOutlined />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}

                  {filteredDistricts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography
                          color="text.secondary"
                          sx={{ py: 5 }}
                        >
                          No districts found.
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
          {editing ? "Edit District" : "Add New District"}
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && (
              <Alert severity="error">{formError}</Alert>
            )}

            <TextField
              select
              label="Parent Region"
              required
              fullWidth
              value={form.regionId}
              onChange={(event) =>
                setForm({
                  ...form,
                  regionId: event.target.value,
                })
              }
            >
              <MenuItem value="">Select Region</MenuItem>

              {regions
                .filter(
                  (region) =>
                    region.status === "ACTIVE" ||
                    region.id === form.regionId,
                )
                .map((region) => (
                  <MenuItem key={region.id} value={region.id}>
                    {region.name}
                  </MenuItem>
                ))}
            </TextField>

            <TextField
              label="District Code"
              required
              fullWidth
              slotProps={{
                htmlInput: { maxLength: 50 },
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
              label="District Name"
              required
              fullWidth
              slotProps={{
                htmlInput: { maxLength: 191 },
              }}
              value={form.name}
              onChange={(event) =>
                setForm({
                  ...form,
                  name: event.target.value,
                })
              }
            />

            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={form.description}
              onChange={(event) =>
                setForm({
                  ...form,
                  description: event.target.value,
                })
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
                    status: event.target.value as RecordStatus,
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
            disabled={saveMutation.isPending || regionsQuery.isError}
            onClick={handleSave}
          >
            {saveMutation.isPending
              ? "Saving..."
              : editing
                ? "Save Changes"
                : "Create District"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
