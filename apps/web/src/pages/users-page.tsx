import { useState } from "react";
import axios from "axios";
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, IconButton,
  MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import {
  AddOutlined, DeleteOutlined, EditOutlined, KeyOutlined, PeopleOutlined,
  RefreshOutlined, SecurityOutlined,
} from "@mui/icons-material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createUserApi, getUsersApi, updateUserApi } from "../api/users.api";
import { UserFormDialog } from "../components/users/user-form-dialog";
import { ManageUserRolesDialog } from "../components/users/manage-user-roles-dialog";
import { ResetUserPasswordDialog } from "../components/users/reset-user-password-dialog";
import { DeleteUserDialog } from "../components/users/delete-user-dialog";
import { useAuthStore } from "../stores/auth.store";
import type { CreateUserPayload, UpdateUserPayload, User, UserStatus } from "../types/user.types";

type StatusFilter = "ALL" | UserStatus;
type SaveUserInput =
  | { mode: "create"; payload: CreateUserPayload }
  | { mode: "update"; id: string; payload: UpdateUserPayload };

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message: unknown = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string") return message;
    if (error.response?.status === 403) return "Global administrator access is required.";
  }
  return error instanceof Error ? error.message : "An unexpected error occurred.";
}

function getFullName(user: User): string {
  return [user.firstName, user.middleName, user.lastName].filter(Boolean).join(" ");
}

function getStatusColor(status: UserStatus) {
  switch (status) {
    case "ACTIVE": return "success" as const;
    case "INACTIVE": return "warning" as const;
    case "LOCKED": return "error" as const;
    case "SUSPENDED": return "default" as const;
  }
}

export function UsersPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const hasGlobalAdminAccess = useAuthStore((s) => s.hasGlobalAdminAccess);
  const isGlobalAdmin = hasGlobalAdminAccess();
  const canCreate = isGlobalAdmin && hasPermission("user.create");
  const canUpdate = isGlobalAdmin && hasPermission("user.update");
  const canDelete = isGlobalAdmin && hasPermission("user.delete");
  const canReset = isGlobalAdmin && hasPermission("user.update");
  const canViewRoles = isGlobalAdmin && hasPermission("role.read");
  const canAssignRoles = isGlobalAdmin && hasPermission("permission.assign");
  const showActions = canUpdate || canDelete || canReset || canViewRoles;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [rolesUser, setRolesUser] = useState<User | null>(null);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const usersQuery = useQuery({ queryKey: ["users"], queryFn: getUsersApi });
  const users = usersQuery.data ?? [];
  const filteredUsers = users.filter((user) => {
    if (statusFilter !== "ALL" && user.status !== statusFilter) return false;
    const term = search.trim().toLowerCase();
    if (!term) return true;
    const branch = user.staffProfile?.branch;
    const roles = user.roles ?? [];
    return [
      user.username, getFullName(user), user.email ?? "", user.phone ?? "",
      user.staffProfile?.employeeNumber ?? "", user.staffProfile?.jobTitle ?? "",
      branch?.name ?? "", branch?.district?.name ?? "",
      branch?.district?.region?.name ?? "",
      ...roles.map((a) => a.role?.name ?? ""),
      ...roles.map((a) => a.role?.code ?? ""),
    ].some((value) => value.toLowerCase().includes(term));
  });
  const activeCount = users.filter((u) => u.status === "ACTIVE").length;
  const inactiveCount = users.filter((u) => u.status === "INACTIVE").length;

  async function refreshUsers() {
    await queryClient.invalidateQueries({ queryKey: ["users"] });
  }

  const saveMutation = useMutation({
    mutationFn: async (input: SaveUserInput) => input.mode === "update"
      ? updateUserApi(input.id, input.payload)
      : createUserApi(input.payload),
    onSuccess: async (_result, input) => {
      setDialogOpen(false); setEditingUser(null); setActionError(null);
      setMessage(input.mode === "update" ? "User updated successfully." : "User created successfully. Assign a role to enable access.");
      await refreshUsers();
    },
    onError: (error) => setActionError(getErrorMessage(error)),
  });

  function openCreate() {
    if (!canCreate) return;
    setEditingUser(null); setActionError(null); setMessage(null); setDialogOpen(true);
  }
  function openEdit(user: User) {
    if (!canUpdate) return;
    setEditingUser(user); setActionError(null); setMessage(null); setDialogOpen(true);
  }
  function handleSave(payload: CreateUserPayload | UpdateUserPayload) {
    setActionError(null);
    if (editingUser) saveMutation.mutate({ mode: "update", id: editingUser.id, payload: payload as UpdateUserPayload });
    else saveMutation.mutate({ mode: "create", payload: payload as CreateUserPayload });
  }
  function closeDialog() {
    if (saveMutation.isPending) return;
    setDialogOpen(false); setEditingUser(null); setActionError(null);
  }
  function actionSuccess(text: string) {
    setResetUser(null); setDeleteUser(null); setActionError(null); setMessage(text);
    void refreshUsers();
  }

  return <Box sx={{ p: { xs: 2, md: 3 } }}>
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" }, mb: 3 }}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Users Management</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>Manage user accounts, organizational assignments, roles and account status.</Typography>
      </Box>
      <Stack direction="row" spacing={1}>
        <Button variant="outlined" startIcon={<RefreshOutlined />} disabled={usersQuery.isFetching} onClick={() => void refreshUsers()}>Refresh</Button>
        {canCreate && <Button variant="contained" startIcon={<AddOutlined />} disabled={saveMutation.isPending} onClick={openCreate}>Add User</Button>}
      </Stack>
    </Stack>

    {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message}</Alert>}
    {actionError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>{actionError}</Alert>}

    <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 3 }}>
      {[
        { label: "Total Users", value: users.length },
        { label: "Active Users", value: activeCount },
        { label: "Inactive Users", value: inactiveCount },
      ].map((item, index) => <Card key={item.label} variant="outlined" sx={{ flex: 1 }}><CardContent>
        <Stack
  direction="row"
  spacing={1}
  sx={{ alignItems: "center" }}
>
          {index === 0 && <PeopleOutlined color="primary" />}
          <Typography color="text.secondary">{item.label}</Typography>
        </Stack>
        <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>{item.value}</Typography>
      </CardContent></Card>)}
    </Stack>

    <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
      <CardContent>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" }, mb: 2 }}>
          <Typography variant="h6">User Accounts ({filteredUsers.length})</Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField size="small" label="Search Users" placeholder="Name, username, branch or role" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: 250 }} />
            <TextField select size="small" label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} sx={{ minWidth: 150 }}>
              <MenuItem value="ALL">All Statuses</MenuItem>
              <MenuItem value="ACTIVE">Active</MenuItem>
              <MenuItem value="INACTIVE">Inactive</MenuItem>
              <MenuItem value="LOCKED">Locked</MenuItem>
              <MenuItem value="SUSPENDED">Suspended</MenuItem>
            </TextField>
          </Stack>
        </Stack>
        {usersQuery.isLoading ? <Box sx={{ py: 6, textAlign: "center" }}><CircularProgress /></Box>
          : usersQuery.isError ? <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => void refreshUsers()}>Retry</Button>}>{getErrorMessage(usersQuery.error)}</Alert>
          : <TableContainer><Table>
            <TableHead><TableRow>
              <TableCell>Full Name</TableCell><TableCell>Username</TableCell><TableCell>Contact</TableCell><TableCell>Branch</TableCell>
              <TableCell>Roles</TableCell><TableCell>Status</TableCell><TableCell>Created</TableCell>
              {showActions && <TableCell align="right">Actions</TableCell>}
            </TableRow></TableHead>
            <TableBody>
              {filteredUsers.map((user) => {
                const branch = user.staffProfile?.branch;
                const isSelf = user.id === currentUser?.id;
                return <TableRow key={user.id} hover>
                  <TableCell><Typography sx={{ fontWeight: 600 }}>{getFullName(user)}</Typography></TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell><Typography variant="body2">{user.email || "-"}</Typography><Typography variant="caption" color="text.secondary">{user.phone || ""}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{branch?.name ?? "-"}</Typography><Typography variant="caption" color="text.secondary">{branch?.district?.name ?? ""}</Typography></TableCell>
                  <TableCell><Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap" }}>
                    {(user.roles ?? []).length === 0 ? "-" : (user.roles ?? []).map((a) => <Chip key={a.id} size="small" variant="outlined" label={a.role?.name ?? "Unknown role"} />)}
                  </Stack></TableCell>
                  <TableCell><Chip size="small" label={user.status} color={getStatusColor(user.status)} /></TableCell>
                  <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                  {showActions && <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    {canUpdate && <Tooltip title="Edit User"><span><IconButton aria-label={`Edit ${user.username}`} disabled={saveMutation.isPending} onClick={() => openEdit(user)}><EditOutlined /></IconButton></span></Tooltip>}
                    {canViewRoles && <Tooltip title="Manage Roles"><span><IconButton aria-label={`Manage roles for ${user.username}`} onClick={() => setRolesUser(user)}><SecurityOutlined /></IconButton></span></Tooltip>}
                    {canReset && <Tooltip title={isSelf ? "Cannot reset your own password here" : "Reset Password"}><span><IconButton aria-label={`Reset password for ${user.username}`} disabled={isSelf} onClick={() => setResetUser(user)}><KeyOutlined /></IconButton></span></Tooltip>}
                    {canDelete && <Tooltip title={isSelf ? "Cannot delete your own account" : "Delete User"}><span><IconButton aria-label={`Delete ${user.username}`} color="error" disabled={isSelf} onClick={() => setDeleteUser(user)}><DeleteOutlined /></IconButton></span></Tooltip>}
                  </TableCell>}
                </TableRow>;
              })}
              {filteredUsers.length === 0 && <TableRow><TableCell colSpan={showActions ? 8 : 7} align="center"><Typography color="text.secondary" sx={{ py: 5 }}>No users found.</Typography></TableCell></TableRow>}
            </TableBody>
          </Table></TableContainer>}
      </CardContent>
    </Card>

    {dialogOpen && (
      <UserFormDialog
        open={dialogOpen}
        user={editingUser}
        saving={saveMutation.isPending}
        onClose={closeDialog}
        onSave={handleSave}
      />
    )}
    {rolesUser && (
      <ManageUserRolesDialog
        open={true}
        user={rolesUser}
        canAssign={canAssignRoles}
        onClose={() => setRolesUser(null)}
      />
    )}
    {resetUser && <ResetUserPasswordDialog user={resetUser} onClose={() => setResetUser(null)} onSuccess={actionSuccess} />}
    {deleteUser && <DeleteUserDialog user={deleteUser} onClose={() => setDeleteUser(null)} onSuccess={actionSuccess} />}
  </Box>;
}
