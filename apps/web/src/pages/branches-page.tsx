
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
  getBranchesApi,
  getDistrictsApi,
  getRegionsApi,
} from "../api/organization.api";

import type {
  Branch,
  District,
  Region,
} from "../types/organization.types";

type RecordStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";

interface BranchRecord extends Branch {
  branchType?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  timezone?: string | null;
  district?: District | null;
}

interface BranchForm {
  districtId: string;
  code: string;
  name: string;
  branchType: string;
  phone: string;
  email: string;
  address: string;
  timezone: string;
  status: RecordStatus;
}

const emptyForm: BranchForm = {
  districtId: "",
  code: "",
  name: "",
  branchType: "",
  phone: "",
  email: "",
  address: "",
  timezone: "",
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

export function BranchesPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BranchRecord | null>(null);
  const [form, setForm] = useState<BranchForm>(emptyForm);

  const [formRegionId, setFormRegionId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const regionsQuery = useQuery({
    queryKey: ["regions"],
    queryFn: getRegionsApi,
  });

  const districtsQuery = useQuery({
    queryKey: ["districts"],
    queryFn: () => getDistrictsApi(),
  });

  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: () => getBranchesApi(),
  });

  const regions: Region[] = regionsQuery.data ?? [];
  const districts: District[] = districtsQuery.data ?? [];
  const branches = (branchesQuery.data ?? []) as BranchRecord[];

  const regionById = new Map(
    regions.map((region) => [region.id, region]),
  );

  const districtById = new Map(
    districts.map((district) => [district.id, district]),
  );

  const availableDistricts = districts.filter(
    (district) =>
      !regionFilter || district.regionId === regionFilter,
  );

  const formDistricts = districts.filter(
    (district) =>
      district.regionId === formRegionId &&
      (
        district.status === "ACTIVE" ||
        district.id === form.districtId
      ),
  );

  const filteredBranches = branches.filter((branch) => {
    const district = districtById.get(branch.districtId);
    const region = district
      ? regionById.get(district.regionId)
      : undefined;

    if (regionFilter && district?.regionId !== regionFilter) {
      return false;
    }

    if (districtFilter && branch.districtId !== districtFilter) {
      return false;
    }

    const term = search.trim().toLowerCase();

    return [
      branch.code,
      branch.name,
      branch.branchType ?? "",
      district?.name ?? "",
      region?.name ?? "",
    ].some((value) => value.toLowerCase().includes(term));
  });

  async function refreshOrganization() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["branches"] }),
      queryClient.invalidateQueries({ queryKey: ["districts"] }),
      queryClient.invalidateQueries({ queryKey: ["regions"] }),
    ]);
  }

  const saveMutation = useMutation({
    mutationFn: async (values: BranchForm) => {
      const payload = {
        districtId: values.districtId,
        code: values.code.trim().toUpperCase(),
        name: values.name.trim(),
        branchType: values.branchType.trim(),
        phone: values.phone.trim(),
        email: values.email.trim(),
        address: values.address.trim(),
        timezone: values.timezone.trim(),
      };

      if (editing) {
        await apiClient.patch(
          `${API_ENDPOINTS.branches}/${editing.id}`,
          {
            ...payload,
            status: values.status,
          },
        );
      } else {
        await apiClient.post(API_ENDPOINTS.branches, payload);
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
          ? "Branch updated successfully."
          : "Branch created successfully.",
      );

      await refreshOrganization();
    },
    onError: (error) => {
      setFormError(getErrorMessage(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`${API_ENDPOINTS.branches}/${id}`);
    },
    onSuccess: async () => {
      setActionError(null);
      setMessage("Branch deleted successfully.");
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
      districtId: districtFilter,
    });

    const selectedDistrict = districtById.get(districtFilter);

    setFormRegionId(
      selectedDistrict?.regionId ?? regionFilter,
    );

    setFormError(null);
    setActionError(null);
    setMessage(null);
    setDialogOpen(true);
  }

  function openEdit(branch: BranchRecord) {
    const district = districtById.get(branch.districtId);

    setEditing(branch);
    setFormRegionId(district?.regionId ?? "");

    setForm({
      districtId: branch.districtId,
      code: branch.code,
      name: branch.name,
      branchType: branch.branchType ?? "",
      phone: branch.phone ?? "",
      email: branch.email ?? "",
      address: branch.address ?? "",
      timezone: branch.timezone ?? "",
      status: branch.status as RecordStatus,
    });

    setFormError(null);
    setActionError(null);
    setMessage(null);
    setDialogOpen(true);
  }

  function handleSave() {
    if (!formRegionId || !form.districtId) {
      setFormError("Please select a region and district.");
      return;
    }

    if (!form.code.trim() || !form.name.trim()) {
      setFormError("Branch code and name are required.");
      return;
    }

    const limits: Array<[string, number, string]> = [
      [form.code.trim(), 50, "Branch code"],
      [form.name.trim(), 191, "Branch name"],
      [form.branchType, 100, "Branch type"],
      [form.phone, 50, "Phone"],
      [form.email, 191, "Email"],
      [form.address, 255, "Address"],
      [form.timezone, 100, "Timezone"],
    ];

    for (const [value, max, label] of limits) {
      if (value.length > max) {
        setFormError(`${label} exceeds ${max} characters.`);
        return;
      }
    }

    if (
      form.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    ) {
      setFormError("Enter a valid email address.");
      return;
    }

    setFormError(null);
    saveMutation.mutate(form);
  }

  function handleDelete(branch: BranchRecord) {
    setMessage(null);
    setActionError(null);

    const confirmed = window.confirm(
      `Delete branch "${branch.name}" (${branch.code})?\n\n` +
      "The backend may reject deletion if this branch has dependent records.",
    );

    if (confirmed) {
      deleteMutation.mutate(branch.id);
    }
  }

  const isLoading =
    regionsQuery.isLoading ||
    districtsQuery.isLoading ||
    branchesQuery.isLoading;

  const hasError =
    regionsQuery.isError ||
    districtsQuery.isError ||
    branchesQuery.isError;

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
            Branches Management
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Manage branches, district assignments and branch details.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshOutlined />}
            onClick={() => void refreshOrganization()}
          >
            Refresh
          </Button>

          <Button
            variant="contained"
            startIcon={<AddOutlined />}
            disabled={hasError || isLoading}
            onClick={openCreate}
          >
            Add Branch
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
              Branches ({filteredBranches.length})
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
                onChange={(event) => {
                  setRegionFilter(event.target.value);
                  setDistrictFilter("");
                }}
                sx={{ minWidth: 190 }}
              >
                <MenuItem value="">All Regions</MenuItem>

                {regions.map((region) => (
                  <MenuItem key={region.id} value={region.id}>
                    {region.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                size="small"
                label="Filter by District"
                value={districtFilter}
                onChange={(event) =>
                  setDistrictFilter(event.target.value)
                }
                sx={{ minWidth: 190 }}
              >
                <MenuItem value="">All Districts</MenuItem>

                {availableDistricts.map((district) => (
                  <MenuItem key={district.id} value={district.id}>
                    {district.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                size="small"
                label="Search Branches"
                placeholder="Code or name"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                sx={{ minWidth: 200 }}
              />
            </Stack>
          </Box>

          {isLoading ? (
            <Box sx={{ py: 6, textAlign: "center" }}>
              <CircularProgress />
            </Box>
          ) : hasError ? (
            <Alert severity="error">
              {getErrorMessage(
                branchesQuery.error ??
                districtsQuery.error ??
                regionsQuery.error,
              )}
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Code</TableCell>
                    <TableCell>Branch Name</TableCell>
                    <TableCell>District</TableCell>
                    <TableCell>Region</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {filteredBranches.map((branch) => {
                    const district = districtById.get(branch.districtId);
                    const region = district
                      ? regionById.get(district.regionId)
                      : undefined;

                    return (
                      <TableRow key={branch.id} hover>
                        <TableCell>
                          <Typography sx={{ fontWeight: 600 }}>
                            {branch.code}
                          </Typography>
                        </TableCell>

                        <TableCell>{branch.name}</TableCell>

                        <TableCell>
                          {district?.name ?? "-"}
                        </TableCell>

                        <TableCell>
                          {region?.name ?? "-"}
                        </TableCell>

                        <TableCell>
                          {branch.branchType || "-"}
                        </TableCell>

                        <TableCell>
                          {branch.phone || "-"}
                        </TableCell>

                        <TableCell>
                          <Chip
                            size="small"
                            label={branch.status}
                            color={
                              branch.status === "ACTIVE"
                                ? "success"
                                : branch.status === "INACTIVE"
                                  ? "warning"
                                  : "default"
                            }
                          />
                        </TableCell>

                        <TableCell align="right">
                          <Tooltip title="Edit Branch">
                            <IconButton
                              aria-label={`Edit ${branch.name}`}
                              onClick={() => openEdit(branch)}
                            >
                              <EditOutlined />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Delete Branch">
                            <span>
                              <IconButton
                                color="error"
                                aria-label={`Delete ${branch.name}`}
                                disabled={deleteMutation.isPending}
                                onClick={() => handleDelete(branch)}
                              >
                                <DeleteOutlined />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {filteredBranches.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography
                          color="text.secondary"
                          sx={{ py: 5 }}
                        >
                          No branches found.
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
          {editing ? "Edit Branch" : "Add New Branch"}
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && (
              <Alert severity="error">{formError}</Alert>
            )}

            <TextField
              select
              label="Region"
              required
              fullWidth
              value={formRegionId}
              onChange={(event) => {
                setFormRegionId(event.target.value);
                setForm({
                  ...form,
                  districtId: "",
                });
              }}
            >
              <MenuItem value="">Select Region</MenuItem>

              {regions
                .filter(
                  (region) =>
                    region.status === "ACTIVE" ||
                    region.id === formRegionId,
                )
                .map((region) => (
                  <MenuItem key={region.id} value={region.id}>
                    {region.name}
                  </MenuItem>
                ))}
            </TextField>

            <TextField
              select
              label="District"
              required
              fullWidth
              disabled={!formRegionId}
              value={form.districtId}
              onChange={(event) =>
                setForm({
                  ...form,
                  districtId: event.target.value,
                })
              }
            >
              <MenuItem value="">Select District</MenuItem>

              {formDistricts.map((district) => (
                <MenuItem key={district.id} value={district.id}>
                  {district.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Branch Code"
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
              label="Branch Name"
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
              label="Branch Type"
              fullWidth
              slotProps={{
                htmlInput: { maxLength: 100 },
              }}
              value={form.branchType}
              onChange={(event) =>
                setForm({
                  ...form,
                  branchType: event.target.value,
                })
              }
            />

            <TextField
              label="Phone"
              fullWidth
              slotProps={{
                htmlInput: { maxLength: 50 },
              }}
              value={form.phone}
              onChange={(event) =>
                setForm({
                  ...form,
                  phone: event.target.value,
                })
              }
            />

            <TextField
              label="Email"
              type="email"
              fullWidth
              slotProps={{
                htmlInput: { maxLength: 191 },
              }}
              value={form.email}
              onChange={(event) =>
                setForm({
                  ...form,
                  email: event.target.value,
                })
              }
            />

            <TextField
              label="Address"
              fullWidth
              multiline
              rows={2}
              value={form.address}
              onChange={(event) =>
                setForm({
                  ...form,
                  address: event.target.value,
                })
              }
            />

            <TextField
              label="Timezone"
              fullWidth
              placeholder="Africa/Addis_Ababa"
              slotProps={{
                htmlInput: { maxLength: 100 },
              }}
              value={form.timezone}
              onChange={(event) =>
                setForm({
                  ...form,
                  timezone: event.target.value,
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
            disabled={saveMutation.isPending || hasError}
            onClick={handleSave}
          >
            {saveMutation.isPending
              ? "Saving..."
              : editing
                ? "Save Changes"
                : "Create Branch"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
