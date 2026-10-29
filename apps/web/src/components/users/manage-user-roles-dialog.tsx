
import { useState } from "react";
import axios from "axios";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { DeleteOutlined } from "@mui/icons-material";

import { apiClient } from "../../api/api-client";
import { API_ENDPOINTS } from "../../api/endpoints";
import { getRolesApi } from "../../api/roles.api";
import {
  assignUserRoleApi,
  getUserRolesApi,
  removeUserRoleApi,
} from "../../api/user-roles.api";

import type { ScopeType } from "../../types/auth.types";
import type { User } from "../../types/user.types";

// ============================================================
// TYPES AND HELPERS
// ============================================================

type OrgOption = {
  id: string;
  name: string;
};

const roleScopes: Record<string, ScopeType> = {
  SUPER_ADMIN: "GLOBAL",
  SYSTEM_ADMIN: "GLOBAL",
  AUDITOR: "GLOBAL",

  REGIONAL_MANAGER: "REGION",
  REGIONAL_ANALYST: "REGION",

  DISTRICT_MANAGER: "DISTRICT",
  DISTRICT_ANALYST: "DISTRICT",

  BRANCH_MANAGER: "BRANCH",

  DIGITAL_RESKILLED_STAFF: "STAFF",
};

function errorText(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message: unknown = error.response?.data?.message;

    if (Array.isArray(message)) {
      return message.join(", ");
    }

    if (typeof message === "string") {
      return message;
    }
  }

  return error instanceof Error
    ? error.message
    : "Request failed.";
}

// ============================================================
// COMPONENT PROPS
// ============================================================

interface Props {
  open: boolean;
  user: User | null;
  canAssign: boolean;
  onClose: () => void;
}

// ============================================================
// MANAGE USER ROLES DIALOG
// ============================================================

export function ManageUserRolesDialog({
  open,
  user,
  canAssign,
  onClose,
}: Props) {
  const client = useQueryClient();

  // ----------------------------------------------------------
  // FORM STATE
  // ----------------------------------------------------------

  const [roleId, setRoleId] = useState("");
  const [scopeType, setScopeType] =
    useState<ScopeType>("BRANCH");

  const [regionId, setRegionId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [branchId, setBranchId] = useState("");

  // Workplace branch for DIGITAL_RESKILLED_STAFF.
  // This is different from the role's branch scope.
  const [staffBranchId, setStaffBranchId] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // ----------------------------------------------------------
  // ROLE OPTIONS
  // ----------------------------------------------------------

  const roles = useQuery({
    queryKey: ["role-options"],
    queryFn: getRolesApi,
    enabled: open,
  });

  const availableRoles = (roles.data ?? []).filter(
    (role) =>
      role.status === undefined ||
      role.status === "ACTIVE",
  );

  const selectedRole = availableRoles.find(
    (role) => role.id === roleId,
  );

  const isDigitalReskilledStaff =
    selectedRole?.code === "DIGITAL_RESKILLED_STAFF";

  const requiredScope = selectedRole
    ? roleScopes[selectedRole.code]
    : undefined;

  const isScopeValid =
    !!requiredScope && scopeType === requiredScope;

  // ----------------------------------------------------------
  // CURRENT ASSIGNMENTS
  // ----------------------------------------------------------

  const assignments = useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: () => getUserRolesApi(user!.id),
    enabled: open && !!user,
  });

  // ----------------------------------------------------------
  // ORGANIZATIONAL OPTIONS
  // ----------------------------------------------------------

  const regions = useQuery({
    queryKey: ["role-regions"],
    queryFn: async () =>
      (
        await apiClient.get<OrgOption[]>(
          API_ENDPOINTS.regions,
        )
      ).data,
    enabled:
      open &&
      canAssign &&
      scopeType === "REGION",
  });

  const districts = useQuery({
    queryKey: ["role-districts"],
    queryFn: async () =>
      (
        await apiClient.get<OrgOption[]>(
          API_ENDPOINTS.districts,
        )
      ).data,
    enabled:
      open &&
      canAssign &&
      scopeType === "DISTRICT",
  });

  const branches = useQuery({
    queryKey: ["role-branches"],
    queryFn: async () =>
      (
        await apiClient.get<OrgOption[]>(
          API_ENDPOINTS.branches,
        )
      ).data,
    enabled:
      open &&
      canAssign &&
      (
        scopeType === "BRANCH" ||
        (
          isDigitalReskilledStaff &&
          scopeType === "STAFF"
        )
      ),
  });

  // ----------------------------------------------------------
  // REFRESH DATA
  // ----------------------------------------------------------

  async function refresh() {
    await Promise.all([
      client.invalidateQueries({
        queryKey: ["users"],
      }),
      client.invalidateQueries({
        queryKey: ["user-roles", user?.id],
      }),
    ]);
  }

  // ----------------------------------------------------------
  // ASSIGN / REPLACE ROLE
  // ----------------------------------------------------------

  const assign = useMutation({
    mutationFn: () =>
      assignUserRoleApi({
        userId: user!.id,
        roleId,
        scopeType,

        ...(scopeType === "REGION"
          ? { regionId }
          : {}),

        ...(scopeType === "DISTRICT"
          ? { districtId }
          : {}),

        ...(scopeType === "BRANCH"
          ? { branchId }
          : {}),

        ...(isDigitalReskilledStaff &&
        scopeType === "STAFF"
          ? { staffBranchId }
          : {}),
      }),

    onSuccess: async () => {
      setError(null);
      setNotice("User role replaced successfully.");

      setRoleId("");
      setScopeType("BRANCH");

      setRegionId("");
      setDistrictId("");
      setBranchId("");
      setStaffBranchId("");

      await refresh();
    },

    onError: (mutationError) => {
      setNotice(null);
      setError(errorText(mutationError));
    },
  });

  // ----------------------------------------------------------
  // REMOVE ROLE
  // ----------------------------------------------------------

  const remove = useMutation({
    mutationFn: removeUserRoleApi,

    onSuccess: async () => {
      setError(null);
      setNotice("Role assignment removed.");

      await refresh();
    },

    onError: (mutationError) => {
      setNotice(null);
      setError(errorText(mutationError));
    },
  });

  const busy = assign.isPending || remove.isPending;

  // ----------------------------------------------------------
  // FORM VALIDATION
  // ----------------------------------------------------------

  const hasScopeId =
    scopeType === "GLOBAL" ||
    (
      scopeType === "STAFF" &&
      (
        !isDigitalReskilledStaff ||
        !!staffBranchId
      )
    ) ||
    (
      scopeType === "REGION" &&
      !!regionId
    ) ||
    (
      scopeType === "DISTRICT" &&
      !!districtId
    ) ||
    (
      scopeType === "BRANCH" &&
      !!branchId
    );

  const canSubmit =
    !!user &&
    !!roleId &&
    isScopeValid &&
    hasScopeId &&
    !busy &&
    !assignments.isLoading &&
    !assignments.isError;

  const organizationLoadError =
    (
      scopeType === "REGION" &&
      regions.isError
    ) ||
    (
      scopeType === "DISTRICT" &&
      districts.isError
    ) ||
    (
      (
        scopeType === "BRANCH" ||
        (
          isDigitalReskilledStaff &&
          scopeType === "STAFF"
        )
      ) &&
      branches.isError
    );

  // ----------------------------------------------------------
  // ROLE SELECTION
  // ----------------------------------------------------------

  function handleRoleChange(nextRoleId: string) {
    setRoleId(nextRoleId);

    setError(null);
    setNotice(null);

    const nextRole = availableRoles.find(
      (role) => role.id === nextRoleId,
    );

    const nextScope =
      (nextRole && roleScopes[nextRole.code]) ||
      "BRANCH";

    setScopeType(nextScope);

    setRegionId("");
    setDistrictId("");
    setBranchId("");
    setStaffBranchId("");
  }

  // ----------------------------------------------------------
  // SUBMIT WITH CONFIRMATION
  // ----------------------------------------------------------

  function handleReplaceRole() {
    if (!canSubmit || !selectedRole || !user) {
      return;
    }

    const currentAssignments =
      assignments.data ?? [];

    const existingRoles = currentAssignments
      .map((assignment) => assignment.role?.name)
      .filter(Boolean)
      .join(", ");

    const message =
      currentAssignments.length > 0
        ? (
          `Replace the existing role assignment(s) for ` +
          `${user.username}?\n\n` +
          `Current: ${existingRoles || "Unknown"}\n` +
          `New: ${selectedRole.name}\n\n` +
          `The previous role assignment(s) will be removed.`
        )
        : (
          `Assign ${selectedRole.name} to ` +
          `${user.username}?`
        );

    if (window.confirm(message)) {
      assign.mutate();
    }
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>
        Manage Roles — {user?.username}
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>

          {/* --------------------------------------------------
              ERROR AND SUCCESS MESSAGES
          -------------------------------------------------- */}

          {error && (
            <Alert
              severity="error"
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          {notice && (
            <Alert
              severity="success"
              onClose={() => setNotice(null)}
            >
              {notice}
            </Alert>
          )}

          {/* --------------------------------------------------
              CURRENT ROLE ASSIGNMENTS
          -------------------------------------------------- */}

          <Typography variant="subtitle2">
            Current assignments
          </Typography>

          {assignments.isLoading ? (
            <CircularProgress size={22} />
          ) : assignments.isError ? (
            <Alert severity="error">
              {errorText(assignments.error)}
            </Alert>
          ) : assignments.data?.length ? (
            assignments.data.map((assignment) => (
              <Stack
                key={assignment.id}
                direction="row"
                spacing={1}
                sx={{
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600 }}
                  >
                    {assignment.role?.name ??
                      "Unknown role"}
                  </Typography>

                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: "center" }}
                  >
                    <Chip
                      label={assignment.scopeType}
                      size="small"
                      variant="outlined"
                    />

                    <Typography
                      variant="caption"
                      color="text.secondary"
                    >
                      {assignment.branch?.name ??
                        assignment.district?.name ??
                        assignment.region?.name ??
                        ""}
                    </Typography>
                  </Stack>
                </Box>

                {canAssign && (
                  <Tooltip title="Remove assignment">
                    <span>
                      <IconButton
                        color="error"
                        aria-label={
                          `Remove ${
                            assignment.role?.name ??
                            "role"
                          } assignment`
                        }
                        disabled={busy}
                        onClick={() => {
                          const confirmed =
                            window.confirm(
                              `Remove ${
                                assignment.role?.name ??
                                "this role"
                              } (${assignment.scopeType}) ` +
                              `from ${user?.username}?`,
                            );

                          if (confirmed) {
                            remove.mutate(
                              assignment.id,
                            );
                          }
                        }}
                      >
                        <DeleteOutlined />
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
              </Stack>
            ))
          ) : (
            <Typography
              color="text.secondary"
              variant="body2"
            >
              No roles assigned.
            </Typography>
          )}

          {/* --------------------------------------------------
              REPLACE ROLE FORM
          -------------------------------------------------- */}

          {canAssign && (
            <>
              <Typography
                variant="subtitle2"
                sx={{ pt: 1 }}
              >
                Assign or replace role
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
              >
                Selecting a new role replaces the
                user's existing role assignments.
              </Typography>

              {roles.isError && (
                <Alert severity="error">
                  {errorText(roles.error)}
                </Alert>
              )}

              {/* ROLE */}

              <TextField
                select
                fullWidth
                size="small"
                label="Role"
                value={roleId}
                disabled={
                  busy ||
                  roles.isLoading
                }
                onChange={(event) =>
                  handleRoleChange(
                    event.target.value,
                  )
                }
              >
                {availableRoles.map((role) => (
                  <MenuItem
                    key={role.id}
                    value={role.id}
                  >
                    {role.name} ({role.code})
                  </MenuItem>
                ))}
              </TextField>

              {/* SCOPE - AUTOMATICALLY DETERMINED */}

              <TextField
                fullWidth
                size="small"
                label="Scope"
                value={scopeType}
                disabled
                helperText={
                  "Scope is determined by the selected role."
                }
              />

              {/* REGION */}

              {scopeType === "REGION" &&
                !!roleId && (
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Region"
                    value={regionId}
                    disabled={
                      busy ||
                      regions.isLoading
                    }
                    onChange={(event) =>
                      setRegionId(
                        event.target.value,
                      )
                    }
                  >
                    {(regions.data ?? []).map(
                      (region) => (
                        <MenuItem
                          key={region.id}
                          value={region.id}
                        >
                          {region.name}
                        </MenuItem>
                      ),
                    )}
                  </TextField>
                )}

              {/* DISTRICT */}

              {scopeType === "DISTRICT" &&
                !!roleId && (
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="District"
                    value={districtId}
                    disabled={
                      busy ||
                      districts.isLoading
                    }
                    onChange={(event) =>
                      setDistrictId(
                        event.target.value,
                      )
                    }
                  >
                    {(districts.data ?? []).map(
                      (district) => (
                        <MenuItem
                          key={district.id}
                          value={district.id}
                        >
                          {district.name}
                        </MenuItem>
                      ),
                    )}
                  </TextField>
                )}

              {/* BRANCH ROLE SCOPE */}

              {scopeType === "BRANCH" &&
                !!roleId && (
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Branch"
                    value={branchId}
                    disabled={
                      busy ||
                      branches.isLoading
                    }
                    onChange={(event) =>
                      setBranchId(
                        event.target.value,
                      )
                    }
                  >
                    {(branches.data ?? []).map(
                      (branch) => (
                        <MenuItem
                          key={branch.id}
                          value={branch.id}
                        >
                          {branch.name}
                        </MenuItem>
                      ),
                    )}
                  </TextField>
                )}

              {/* DIGITAL RESKILLED STAFF BRANCH */}

              {isDigitalReskilledStaff &&
                scopeType === "STAFF" && (
                  <TextField
                    select
                    fullWidth
                    required
                    size="small"
                    label="Staff Branch"
                    value={staffBranchId}
                    disabled={
                      busy ||
                      branches.isLoading
                    }
                    onChange={(event) => {
                      setStaffBranchId(
                        event.target.value,
                      );
                      setError(null);
                    }}
                    helperText={
                      "Select the branch where this staff member works."
                    }
                  >
                    {(branches.data ?? []).map(
                      (branch) => (
                        <MenuItem
                          key={branch.id}
                          value={branch.id}
                        >
                          {branch.name}
                        </MenuItem>
                      ),
                    )}
                  </TextField>
                )}

              {/* ORGANIZATIONAL LOAD ERRORS */}

              {organizationLoadError && (
                <Alert severity="error">
                  Could not load organizational options.
                </Alert>
              )}

              {/* REPLACE ROLE BUTTON */}

              <Button
                variant="contained"
                disabled={!canSubmit}
                onClick={handleReplaceRole}
              >
                {assign.isPending
                  ? "Saving..."
                  : assignments.data?.length
                    ? "Replace Role"
                    : "Assign Role"}
              </Button>
            </>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button
          disabled={busy}
          onClick={onClose}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
