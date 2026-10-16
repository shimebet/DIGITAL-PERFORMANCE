import { useEffect, useMemo, useState } from "react";
import axios from "axios";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";

import { useQuery } from "@tanstack/react-query";

import { getFollowUpReassignmentOptionsApi } from "../../api/follow-ups.api";

import type {
  FollowUp,
  ReassignFollowUpRequest,
} from "../../types/follow-up.types";

interface Props {
  open: boolean;
  followUp: FollowUp | null;
  onClose: () => void;
  onSubmit: (
    id: string,
    payload: ReassignFollowUpRequest,
  ) => Promise<void>;
  submitting: boolean;
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;

    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string") return message;

    return error.message;
  }

  return error instanceof Error
    ? error.message
    : "Unable to reassign follow-up.";
}

export function FollowUpReassignDialog({
  open,
  followUp,
  onClose,
  onSubmit,
  submitting,
}: Props) {
  const [replacementId, setReplacementId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setReplacementId("");
    setError(null);
  }, [open, followUp?.id]);

  const staffQuery = useQuery({
    queryKey: ["follow-ups", "reassignment-options", followUp?.id],
    queryFn: () => getFollowUpReassignmentOptionsApi(followUp!.id),
    enabled: open && Boolean(followUp),
    retry: false,
  });

  const eligibleStaff = useMemo(() => {
    if (!followUp) return [];

    return (staffQuery.data ?? []).filter(
      (user) => user.id !== followUp.assignedToUserId,
    );
  }, [staffQuery.data, followUp]);

  const currentEmployee = followUp?.assignedTo
    ? [
        followUp.assignedTo.firstName,
        followUp.assignedTo.lastName,
      ]
        .filter(Boolean)
        .join(" ") || followUp.assignedTo.username
    : followUp?.assignedToUserId ?? "Unknown";

  function close() {
    if (submitting) return;

    setReplacementId("");
    setError(null);
    onClose();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!followUp || submitting) return;

    if (!followUp.isEnabled || followUp.deletedAt) {
      setError("Only enabled follow-ups can be reassigned.");
      return;
    }

    const replacement = eligibleStaff.find(
      (user) => user.id === replacementId,
    );

    if (!replacement) {
      setError("Please select an eligible replacement employee.");
      return;
    }

    try {
      await onSubmit(followUp.id, {
        assignedToUserId: replacement.id,
      });
    } catch (submissionError) {
      setError(getErrorMessage(submissionError));
    }
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      fullWidth
      maxWidth="sm"
    >
      <Box component="form" onSubmit={submit}>
        <DialogTitle>Reassign Follow-up</DialogTitle>

        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Reassign this follow-up to another active employee
            in the same branch.
          </Typography>

          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Current employee:</strong> {currentEmployee}
          </Typography>

          <Typography variant="body2" sx={{ mb: 2 }}>
            <strong>Branch:</strong>{" "}
            {followUp?.branch?.name ?? followUp?.branchId ?? "N/A"}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {staffQuery.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {getErrorMessage(staffQuery.error)}
            </Alert>
          )}

          {staffQuery.isPending && open && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <CircularProgress size={20} />
              <Typography variant="body2">
                Loading eligible employees...
              </Typography>
            </Box>
          )}

          {!staffQuery.isPending &&
            !staffQuery.isError &&
            eligibleStaff.length === 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                No eligible replacement employees are available
                in this branch.
              </Alert>
            )}

          <TextField
            select
            fullWidth
            label="Replacement Employee"
            value={replacementId}
            onChange={(event) => {
              setReplacementId(event.target.value);
              setError(null);
            }}
            disabled={
              submitting ||
              staffQuery.isPending ||
              staffQuery.isError ||
              eligibleStaff.length === 0
            }
            required
          >
            {eligibleStaff.map((user) => (
              <MenuItem key={user.id} value={user.id}>
                {[user.firstName, user.lastName]
                  .filter(Boolean)
                  .join(" ") || user.username}
                {" ("}{user.username}{")"}
              </MenuItem>
            ))}
          </TextField>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 2 }}
          >
            Reassignment changes the responsible employee.
            Follow-up details and history are preserved.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={close} disabled={submitting}>
            Cancel
          </Button>

          <Button
            type="submit"
            variant="contained"
            disabled={
              submitting ||
              !replacementId ||
              !eligibleStaff.some((user) => user.id === replacementId)
            }
          >
            {submitting ? "Reassigning..." : "Confirm Reassignment"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
