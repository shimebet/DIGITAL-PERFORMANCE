import { useEffect, useState } from "react";
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
} from "@mui/material";

import type {
  FollowUp,
  FollowUpStatus,
  UpdateFollowUpStatusRequest,
} from "../../types/follow-up.types";

interface Props {
  open: boolean;
  followUp: FollowUp | null;
  onClose: () => void;
  onSubmit: (
    id: string,
    payload: UpdateFollowUpStatusRequest,
  ) => Promise<void>;
  submitting: boolean;
}

const statuses: FollowUpStatus[] = [
  "OPEN",
  "CONTACTED",
  "RESCHEDULED",
  "CONVERTED",
  "NOT_INTERESTED",
  "UNREACHABLE",
  "CLOSED",
];

function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;

    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string") return message;

    return error.message;
  }

  return error instanceof Error
    ? error.message
    : "Unable to update follow-up status.";
}

function toDateInput(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
}

export function FollowUpStatusDialog({
  open,
  followUp,
  onClose,
  onSubmit,
  submitting,
}: Props) {
  const [status, setStatus] = useState<FollowUpStatus>("OPEN");
  const [note, setNote] = useState("");
  const [outcome, setOutcome] = useState("");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setStatus(followUp?.status ?? "OPEN");
    setNote("");
    setOutcome(followUp?.outcome ?? "");
    setNextFollowUpDate(toDateInput(followUp?.nextFollowUpDate));
    setError(null);
  }, [open, followUp]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!followUp) return;

    if (status === "RESCHEDULED" && !nextFollowUpDate) {
      setError("Next follow-up date is required when rescheduling.");
      return;
    }

    const payload: UpdateFollowUpStatusRequest = {
      status,
      ...(note.trim() ? { note: note.trim() } : {}),
      ...(outcome.trim() ? { outcome: outcome.trim() } : {}),
      ...(nextFollowUpDate
        ? { nextFollowUpDate }
        : {}),
    };

    try {
      await onSubmit(followUp.id, payload);
    } catch (submissionError) {
      setError(errorMessage(submissionError));
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!submitting) onClose();
      }}
      fullWidth
      maxWidth="sm"
    >
      <Box component="form" onSubmit={submit}>
        <DialogTitle>Update Follow-up Status</DialogTitle>

        <DialogContent>
          <Box sx={{ display: "grid", gap: 2, pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label="Customer"
              value={
                followUp?.customerNameMasked ||
                followUp?.customerReference ||
                "N/A"
              }
              fullWidth
              disabled
            />

            <TextField
              select
              required
              label="Status"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as FollowUpStatus)
              }
              fullWidth
              disabled={submitting}
            >
              {statuses.map((value) => (
                <MenuItem key={value} value={value}>
                  {value.replaceAll("_", " ")}
                </MenuItem>
              ))}
            </TextField>

            {status === "RESCHEDULED" && (
              <TextField
                required
                label="Next Follow-up Date"
                type="date"
                value={nextFollowUpDate}
                onChange={(event) =>
                  setNextFollowUpDate(event.target.value)
                }
                slotProps={{
                  inputLabel: { shrink: true },
                }}
                fullWidth
                disabled={submitting}
              />
            )}

            <TextField
              label="Outcome"
              value={outcome}
              onChange={(event) =>
                setOutcome(event.target.value)
              }
              multiline
              minRows={2}
              fullWidth
              disabled={submitting}
              helperText="Describe the customer contact result or conversion outcome."
            />

            <TextField
              label="Status Change Note"
              value={note}
              onChange={(event) =>
                setNote(event.target.value)
              }
              multiline
              minRows={2}
              fullWidth
              disabled={submitting}
              helperText="This note will be recorded in follow-up history."
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="contained"
            disabled={submitting || !followUp}
            startIcon={
              submitting
                ? <CircularProgress size={16} />
                : undefined
            }
          >
            {submitting ? "Updating..." : "Update Status"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
