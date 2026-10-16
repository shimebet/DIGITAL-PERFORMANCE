import { useState } from "react";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { DeleteOutlined } from "@mui/icons-material";
import { apiClient } from "../../api/api-client";
import { API_ENDPOINTS } from "../../api/endpoints";
import { getRolesApi } from "../../api/roles.api";
import { assignUserRoleApi, getUserRolesApi, removeUserRoleApi } from "../../api/user-roles.api";
import type { ScopeType } from "../../types/auth.types";
import type { User } from "../../types/user.types";

type OrgOption = { id: string; name: string };
const scopes: ScopeType[] = ["GLOBAL", "REGION", "DISTRICT", "BRANCH", "STAFF"];

function errorText(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message: unknown = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string") return message;
  }
  return error instanceof Error ? error.message : "Request failed.";
}

interface Props {
  open: boolean;
  user: User | null;
  canAssign: boolean;
  onClose: () => void;
}

export function ManageUserRolesDialog({ open, user, canAssign, onClose }: Props) {
  const client = useQueryClient();
  const [roleId, setRoleId] = useState("");
  const [scopeType, setScopeType] = useState<ScopeType>("BRANCH");
  const [regionId, setRegionId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);


  const roles = useQuery({ queryKey: ["role-options"], queryFn: getRolesApi, enabled: open });
  const assignments = useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: () => getUserRolesApi(user!.id),
    enabled: open && !!user,
  });
  const regions = useQuery({
    queryKey: ["role-regions"],
    queryFn: async () => (await apiClient.get<OrgOption[]>(API_ENDPOINTS.regions)).data,
    enabled: open && canAssign && scopeType === "REGION",
  });
  const districts = useQuery({
    queryKey: ["role-districts"],
    queryFn: async () => (await apiClient.get<OrgOption[]>(API_ENDPOINTS.districts)).data,
    enabled: open && canAssign && scopeType === "DISTRICT",
  });
  const branches = useQuery({
    queryKey: ["role-branches"],
    queryFn: async () => (await apiClient.get<OrgOption[]>(API_ENDPOINTS.branches)).data,
    enabled: open && canAssign && scopeType === "BRANCH",
  });

  async function refresh() {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["users"] }),
      client.invalidateQueries({ queryKey: ["user-roles", user?.id] }),
    ]);
  }

  const assign = useMutation({
    mutationFn: () => assignUserRoleApi({
      userId: user!.id,
      roleId,
      scopeType,
      ...(scopeType === "REGION" ? { regionId } : {}),
      ...(scopeType === "DISTRICT" ? { districtId } : {}),
      ...(scopeType === "BRANCH" ? { branchId } : {}),
    }),
    onSuccess: async () => {
      setError(null); setNotice("Role assigned successfully."); setRoleId("");
      await refresh();
    },
    onError: (e) => setError(errorText(e)),
  });
  const remove = useMutation({
    mutationFn: removeUserRoleApi,
    onSuccess: async () => {
      setError(null); setNotice("Role assignment removed.");
      await refresh();
    },
    onError: (e) => setError(errorText(e)),
  });
  const busy = assign.isPending || remove.isPending;
  const hasScopeId = scopeType === "GLOBAL" || scopeType === "STAFF" ||
    (scopeType === "REGION" && !!regionId) ||
    (scopeType === "DISTRICT" && !!districtId) ||
    (scopeType === "BRANCH" && !!branchId);
  const availableRoles = (roles.data ?? []).filter((r) => r.status === undefined || r.status === "ACTIVE");

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Manage Roles — {user?.username}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
          {notice && <Alert severity="success" onClose={() => setNotice(null)}>{notice}</Alert>}
          <Typography variant="subtitle2">Current assignments</Typography>
          {assignments.isLoading ? <CircularProgress size={22} /> : assignments.isError ? (
            <Alert severity="error">{errorText(assignments.error)}</Alert>
          ) : assignments.data?.length ? assignments.data.map((a) => (
            <Stack
              key={a.id}
              direction="row"
              spacing={1}
              sx={{
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>

                  {a.role?.name ?? "Unknown role"}</Typography>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: "center" }}
                >
                  <Chip label={a.scopeType} size="small" variant="outlined" />
                  <Typography variant="caption" color="text.secondary">
                    {a.branch?.name ?? a.district?.name ?? a.region?.name ?? ""}
                  </Typography>
                </Stack>
              </Box>
              {canAssign && <Tooltip title="Remove assignment"><span><IconButton
                color="error" aria-label={`Remove ${a.role?.name ?? "role"} assignment`}
                disabled={busy} onClick={() => {
                  if (window.confirm(`Remove ${a.role?.name ?? "this role"} (${a.scopeType}) from ${user?.username}?`)) remove.mutate(a.id);
                }}
              ><DeleteOutlined /></IconButton></span></Tooltip>}
            </Stack>
          )) : <Typography color="text.secondary" variant="body2">No roles assigned.</Typography>}
          {canAssign && <>
            <Typography variant="subtitle2" sx={{ pt: 1 }}>Assign new role</Typography>
            {roles.isError && <Alert severity="error">{errorText(roles.error)}</Alert>}
            <TextField select fullWidth size="small" label="Role" value={roleId} onChange={(e) => setRoleId(e.target.value)} disabled={busy || roles.isLoading}>
              {availableRoles.map((role) => <MenuItem key={role.id} value={role.id}>{role.name} ({role.code})</MenuItem>)}
            </TextField>
            <TextField select fullWidth size="small" label="Scope" value={scopeType} disabled={busy} onChange={(e) => {
              setScopeType(e.target.value as ScopeType); setRegionId(""); setDistrictId(""); setBranchId("");
            }}>
              {scopes.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
            {scopeType === "REGION" && <TextField select fullWidth size="small" label="Region" value={regionId} disabled={busy || regions.isLoading} onChange={(e) => setRegionId(e.target.value)}>
              {(regions.data ?? []).map((r) => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}
            </TextField>}
            {scopeType === "DISTRICT" && <TextField select fullWidth size="small" label="District" value={districtId} disabled={busy || districts.isLoading} onChange={(e) => setDistrictId(e.target.value)}>
              {(districts.data ?? []).map((d) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
            </TextField>}
            {scopeType === "BRANCH" && <TextField select fullWidth size="small" label="Branch" value={branchId} disabled={busy || branches.isLoading} onChange={(e) => setBranchId(e.target.value)}>
              {(branches.data ?? []).map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
            </TextField>}
            {((scopeType === "REGION" && regions.isError) || (scopeType === "DISTRICT" && districts.isError) || (scopeType === "BRANCH" && branches.isError)) &&
              <Alert severity="error">Could not load organizational options.</Alert>}
            <Button variant="contained" disabled={!roleId || !hasScopeId || busy} onClick={() => assign.mutate()}>
              {assign.isPending ? "Assigning…" : "Assign Role"}
            </Button>
          </>}
        </Stack>
      </DialogContent>
      <DialogActions><Button disabled={busy} onClick={onClose}>Close</Button></DialogActions>
    </Dialog>
  );
}
