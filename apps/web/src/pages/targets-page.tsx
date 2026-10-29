import { useState } from "react";
import axios from "axios";
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogTitle, FormControl,
  InputLabel, MenuItem, Select,
  IconButton, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Tooltip, Typography,
} from "@mui/material";
import {
  AddOutlined, AssignmentOutlined, CloudUploadOutlined,
  DeleteOutlined, EditOutlined, RefreshOutlined,
} from "@mui/icons-material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  assignTargetApi, createTargetApi, deleteTargetApi,
  getTargetAssignmentsApi, getTargetsApi,
  removeTargetAssignmentApi, updateTargetApi,
} from "../api/targets.api";
import { TargetFormDialog } from "../components/targets/target-form-dialog";
import { TargetAssignmentDialog } from "../components/targets/target-assignment-dialog";
import { TargetAssignmentsDialog } from "../components/targets/target-assignments-dialog";
import { TargetImportDialog } from "../components/targets/target-import-dialog";
import { TargetBulkImportDialog } from "../components/targets/target-bulk-import-dialog";
import { useAuthStore } from "../stores/auth.store";
import type { Target, TargetAssignment } from "../types/target.types";
import type {
  TargetAssignmentFormValues, TargetFormValues,
} from "../validation/target.schema";

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string") return message;
    if (error.response?.status) {
      return `Request failed with status ${error.response.status}.`;
    }
    return error.message || "Unable to communicate with the server.";
  }
  return error instanceof Error ? error.message : "An unexpected error occurred.";
}

function formatMetric(value: string): string {
  return value.split("_").map((word) =>
    word.charAt(0) + word.slice(1).toLowerCase(),
  ).join(" ");
}

function formatPeriod(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function formatDate(value: string): string {
  return value.slice(0, 10);
}

const ASSIGNMENT_QUERY_KEYS = [
  "targets", "target-assignments", "dashboard-overview",
  "dashboard-trend", "dashboard-products", "dashboard-branches",
];

export function TargetsPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canCreate = hasPermission("target.create");
  const canUpdate = hasPermission("target.update");
  const canDelete = hasPermission("target.delete");

  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<Target | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<Target | null>(null);
  const [parentPickerOpen, setParentPickerOpen] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState("");
  const [assignmentsOpen, setAssignmentsOpen] = useState(false);
  const [assignmentsTarget, setAssignmentsTarget] = useState<Target | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const targetsQuery = useQuery({
    queryKey: ["targets", user?.id],
    queryFn: getTargetsApi,
    enabled: Boolean(user),
  });

  const assignmentsQuery = useQuery({
    queryKey: ["target-assignments", user?.id, assignmentsTarget?.id],
    queryFn: () => getTargetAssignmentsApi(assignmentsTarget!.id),
    enabled: Boolean(assignmentsOpen && assignmentsTarget),
  });

  // Fetch the target's existing assignments before opening the assignment form.
  // The chosen parent must be a persisted assignment, never a made-up UUID.
  const parentAssignmentsQuery = useQuery({
    queryKey: ["target-assignments", user?.id, assignTarget?.id],
    queryFn: () => getTargetAssignmentsApi(assignTarget!.id),
    enabled: Boolean(parentPickerOpen && assignTarget),
  });

  const availableParents = parentAssignmentsQuery.data ?? [];

  async function invalidateAssignmentQueries() {
    await Promise.all(
      ASSIGNMENT_QUERY_KEYS.map((key) =>
        queryClient.invalidateQueries({ queryKey: [key] }),
      ),
    );
  }

  async function invalidateTargetQueries() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["targets"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] }),
    ]);
  }

  const saveMutation = useMutation({
    mutationFn: async (values: TargetFormValues) => {
      const payload = {
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        metricType: values.metricType,
        periodType: values.periodType,
        startDate: values.startDate,
        endDate: values.endDate,
        defaultTargetValue: values.defaultTargetValue,
      };
      return editingTarget
        ? updateTargetApi(editingTarget.id, payload)
        : createTargetApi(payload);
    },
    onSuccess: async () => {
      setActionError(null);
      setSuccessMessage(editingTarget
        ? "Target updated successfully."
        : "Target created successfully.");
      setFormOpen(false);
      setEditingTarget(null);
      await invalidateTargetQueries();
    },
    onError: (error) => setActionError(getErrorMessage(error)),
  });

  const assignMutation = useMutation({
    mutationFn: (values: TargetAssignmentFormValues) => {
      if (!assignTarget) throw new Error("Target is not selected.");

      const expectedParentScope: Record<string, string> = {
        REGION: "GLOBAL",
        DISTRICT: "REGION",
        BRANCH: "DISTRICT",
        STAFF: "BRANCH",
      };
      const isGlobal = values.scopeType === "GLOBAL";
      const parent = availableParents.find((item) => item.id === selectedParentId);

      if (!isGlobal) {
        if (!parent) {
          throw new Error(`${values.scopeType} assignments require an existing parent assignment. Select a parent first.`);
        }
        if (parent.scopeType !== expectedParentScope[values.scopeType]) {
          throw new Error(`${values.scopeType} assignments require a ${expectedParentScope[values.scopeType]} parent assignment.`);
        }
        if ((parent.productId ?? null) !== (values.productId || null)) {
          throw new Error("The parent assignment and child assignment must use the same product/channel.");
        }
        if (Number(values.targetValue) > Number(parent.targetValue)) {
          throw new Error("The requested value exceeds the parent's total target value. Check its remaining capacity.");
        }
      }

      const payload: Parameters<typeof assignTargetApi>[0] & {
        parentAssignmentId?: string;
      } = {
        targetId: assignTarget.id,
        scopeType: values.scopeType,
        parentAssignmentId: isGlobal ? undefined : selectedParentId,
        regionId: values.regionId || undefined,
        districtId: values.districtId || undefined,
        branchId: values.branchId || undefined,
        userId: values.userId || undefined,
        productId: values.productId || undefined,
        targetValue: values.targetValue,
      };
      return assignTargetApi(payload);
    },
    onSuccess: async () => {
      setActionError(null);
      setSuccessMessage("Target assigned successfully.");
      setAssignOpen(false);
      setAssignTarget(null);
      setSelectedParentId("");
      await invalidateAssignmentQueries();
    },
    onError: (error) => setActionError(getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTargetApi(id),
    onSuccess: async () => {
      setActionError(null);
      setSuccessMessage("Target deleted successfully.");
      await invalidateTargetQueries();
    },
    onError: (error) => setActionError(getErrorMessage(error)),
  });

  const removeAssignmentMutation = useMutation({
    mutationFn: (id: string) => removeTargetAssignmentApi(id),
    onSuccess: async () => {
      setActionError(null);
      setSuccessMessage("Target assignment removed successfully.");
      await invalidateAssignmentQueries();
    },
    onError: (error) => setActionError(getErrorMessage(error)),
  });

  function clearMessages() {
    setActionError(null);
    setSuccessMessage(null);
  }

  function openCreate() {
    clearMessages();
    setEditingTarget(null);
    setFormOpen(true);
  }

  function openEdit(target: Target) {
    clearMessages();
    setEditingTarget(target);
    setFormOpen(true);
  }

  function openAssign(target: Target) {
    clearMessages();
    setAssignTarget(target);
    setSelectedParentId("");
    setParentPickerOpen(true);
  }

  function openAssignments(target: Target) {
    clearMessages();
    setAssignmentsTarget(target);
    setAssignmentsOpen(true);
  }

  function closeAssignments() {
    setAssignmentsOpen(false);
    setAssignmentsTarget(null);
    setActionError(null);
  }

  function handleDeleteTarget(target: Target) {
    clearMessages();
    if (window.confirm(`Delete target "${target.name}"?`)) {
      deleteMutation.mutate(target.id);
    }
  }

  function handleDeleteAssignment(assignment: TargetAssignment) {
    clearMessages();
    if (window.confirm("Remove this target assignment?")) {
      removeAssignmentMutation.mutate(assignment.id);
    }
  }

  async function refreshTargets() {
    clearMessages();
    await targetsQuery.refetch();
  }

  const targets = targetsQuery.data ?? [];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" },
        justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" },
        gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h4">Targets</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Manage performance targets, organizational assignments,
            products and reporting periods.
          </Typography>
        </Box>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          <Button variant="outlined" startIcon={<RefreshOutlined />}
            disabled={targetsQuery.isFetching} onClick={() => void refreshTargets()}>
            Refresh
          </Button>
{canCreate && (
  <>
    <Button
      variant="outlined"
      startIcon={<CloudUploadOutlined />}
      onClick={() => {
        clearMessages();
        setBulkImportOpen(true);
      }}
    >
      Import Targets CSV
    </Button>

    {/* <Button
      variant="outlined"
      startIcon={<CloudUploadOutlined />}
      onClick={() => {
        clearMessages();
        setImportOpen(true);
      }}
    >
      Import Assignments CSV
    </Button> */}
  </>
)}
          {canCreate && (
            <Button variant="contained" startIcon={<AddOutlined />} onClick={openCreate}>
              Create Target
            </Button>
          )}
        </Box>
      </Box>

      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}
      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
        <CardContent>
          {targetsQuery.isLoading && (
            <Box sx={{ minHeight: 300, display: "grid", placeItems: "center" }}>
              <CircularProgress />
            </Box>
          )}
          {targetsQuery.isError && (
            <Alert severity="error">{getErrorMessage(targetsQuery.error)}</Alert>
          )}
          {!targetsQuery.isLoading && !targetsQuery.isError && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Target</TableCell>
                    <TableCell>Metric</TableCell>
                    <TableCell>Period</TableCell>
                    <TableCell>Start</TableCell>
                    <TableCell>End</TableCell>
                    <TableCell align="right">Default</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Assignments</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {targets.map((target) => (
                    <TableRow key={target.id} hover>
                      <TableCell>
                        <Typography sx={{ fontWeight: 600 }}>{target.name}</Typography>
                        {target.description && (
                          <Typography variant="caption" color="text.secondary"
                            sx={{ display: "block", mt: 0.25 }}>
                            {target.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{formatMetric(target.metricType)}</TableCell>
                      <TableCell>{formatPeriod(target.periodType)}</TableCell>
                      <TableCell>{formatDate(target.startDate)}</TableCell>
                      <TableCell>{formatDate(target.endDate)}</TableCell>
                      <TableCell align="right">
                        {target.defaultTargetValue == null
                          ? "-"
                          : Number(target.defaultTargetValue).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={target.status}
                          color={target.status === "ACTIVE" ? "success"
                            : target.status === "ARCHIVED" ? "default" : "warning"} />
                      </TableCell>
                      <TableCell align="right">{target._count?.assignments ?? 0}</TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.25 }}>
                          {canCreate && target.status === "ACTIVE" && (
                            <Tooltip title="Assign Target">
                              <IconButton onClick={() => openAssign(target)}>
                                <AddOutlined />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="View Assignments">
                            <IconButton onClick={() => openAssignments(target)}>
                              <AssignmentOutlined />
                            </IconButton>
                          </Tooltip>
                          {canUpdate && (
                            <Tooltip title="Edit Target">
                              <IconButton onClick={() => openEdit(target)}>
                                <EditOutlined />
                              </IconButton>
                            </Tooltip>
                          )}
                          {canDelete && (
                            <Tooltip title="Delete Target">
                              <span>
                                <IconButton color="error" disabled={deleteMutation.isPending}
                                  onClick={() => handleDeleteTarget(target)}>
                                  <DeleteOutlined />
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                  {targets.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} align="center">
                        <Typography color="text.secondary" sx={{ py: 5 }}>
                          No targets found.
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
<TargetBulkImportDialog
  open={bulkImportOpen}
  onClose={() => setBulkImportOpen(false)}
  onImported={async (message) => {
    setActionError(null);
    setSuccessMessage(message);
    await invalidateTargetQueries();
  }}
/>
      <TargetImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={async (message) => {
          setActionError(null);
          // The import has already committed. Keep the success message even
          // if a subsequent query refresh fails; do not prompt a re-import.
          setSuccessMessage(message);
          await invalidateAssignmentQueries();
        }}
      />

      <TargetFormDialog
        open={formOpen}
        target={editingTarget}
        submitting={saveMutation.isPending}
        error={saveMutation.isError ? getErrorMessage(saveMutation.error) : null}
        onClose={() => {
          if (saveMutation.isPending) return;
          setFormOpen(false);
          setEditingTarget(null);
          setActionError(null);
        }}
        onSubmit={async (values: TargetFormValues) => {
          await saveMutation.mutateAsync(values);
        }}
      />

      <Dialog
        open={parentPickerOpen}
        onClose={() => {
          setParentPickerOpen(false);
          setAssignTarget(null);
          setSelectedParentId("");
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Select Assignment Parent</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 2, pt: "16px !important" }}>
          <Typography color="text.secondary">
            {assignTarget?.name ?? "Target"}: choose an existing parent assignment,
            or choose Global to create a root assignment.
          </Typography>
          {parentAssignmentsQuery.isLoading && <CircularProgress size={24} />}
          {parentAssignmentsQuery.isError && (
            <Alert severity="error">{getErrorMessage(parentAssignmentsQuery.error)}</Alert>
          )}
          {!parentAssignmentsQuery.isLoading && !parentAssignmentsQuery.isError && (
            <FormControl fullWidth>
              <InputLabel id="target-parent-label">Assignment parent</InputLabel>
              <Select
                labelId="target-parent-label"
                label="Assignment parent"
                value={selectedParentId}
                onChange={(event) => setSelectedParentId(event.target.value)}
              >
                <MenuItem value="">Global (no parent)</MenuItem>
                {availableParents
                  .filter((item) => item.scopeType !== "STAFF")
                  .map((item) => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.scopeType} — {Number(item.targetValue).toLocaleString()}
                      {item.product?.name ? ` — ${item.product.name}` : ""}
                      {item.region?.name ? ` — ${item.region.name}` : ""}
                      {item.district?.name ? ` — ${item.district.name}` : ""}
                      {item.branch?.name ? ` — ${item.branch.name}` : ""}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          )}
          <Alert severity="info">
            Global has no parent. Region requires Global; District requires Region;
            Branch requires District; Staff requires Branch. Choose the matching
            scope and product in the next form. Existing duplicate assignments
            cannot be created again.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setParentPickerOpen(false);
            setAssignTarget(null);
            setSelectedParentId("");
          }}>Cancel</Button>
          <Button
            variant="contained"
            disabled={parentAssignmentsQuery.isLoading || parentAssignmentsQuery.isError}
            onClick={() => {
              setParentPickerOpen(false);
              setAssignOpen(true);
            }}
          >Continue</Button>
        </DialogActions>
      </Dialog>

      <TargetAssignmentDialog
        open={assignOpen}
        target={assignTarget}
        submitting={assignMutation.isPending}
        error={assignMutation.isError ? getErrorMessage(assignMutation.error) : null}
        onClose={() => {
          if (assignMutation.isPending) return;
          setAssignOpen(false);
          setAssignTarget(null);
          setSelectedParentId("");
          setActionError(null);
        }}
        onSubmit={async (values: TargetAssignmentFormValues) => {
          await assignMutation.mutateAsync(values);
        }}
      />

      <TargetAssignmentsDialog
        open={assignmentsOpen}
        target={assignmentsTarget}
        assignments={assignmentsQuery.data ?? []}
        loading={assignmentsQuery.isLoading}
        deletingId={removeAssignmentMutation.isPending
          ? removeAssignmentMutation.variables ?? null : null}
        canDelete={canDelete}
        error={assignmentsQuery.isError
          ? getErrorMessage(assignmentsQuery.error)
          : removeAssignmentMutation.isError
            ? getErrorMessage(removeAssignmentMutation.error)
            : null}
        onClose={closeAssignments}
        onDelete={handleDeleteAssignment}
      />
    </Box>
  );
}
