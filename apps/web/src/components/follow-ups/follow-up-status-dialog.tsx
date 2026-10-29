
import { useState } from "react";
import type { FormEvent } from "react";
import axios from "axios";

import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";

import type {
  FollowUp,
  FollowUpStatus,
  UpdateFollowUpStatusRequest,
} from "../../types/follow-up.types";

interface Props {
  open: boolean;
  followUp: FollowUp;
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

function getErrorMessage(error: unknown): string {
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

export function FollowUpStatusDialog({
  open,
  followUp,
  onClose,
  onSubmit,
  submitting,
}: Props) {
  const [status, setStatus] = useState<FollowUpStatus>(
    followUp.status,
  );
  const [note, setNote] = useState("");
  const [outcome, setOutcome] = useState(
    followUp.outcome ?? "",
  );
  const [nextFollowUpDate, setNextFollowUpDate] =
    useState(
      followUp.nextFollowUpDate?.slice(0, 10) ?? "",
    );
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (status === "RESCHEDULED" && !nextFollowUpDate) {
      setError("Next follow-up date is required.");
      return;
    }

    const payload: UpdateFollowUpStatusRequest = {
      status,
    };

    if (note.trim()) payload.note = note.trim();
    if (outcome.trim()) payload.outcome = outcome.trim();

    if (status === "RESCHEDULED") {
      payload.nextFollowUpDate = nextFollowUpDate;
    }

    try {
      await onSubmit(followUp.id, payload);
    } catch (submissionError) {
      setError(getErrorMessage(submissionError));
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
      <Box component="form" onSubmit={handleSubmit}>
        <DialogTitle>Update Follow-up Status</DialogTitle>

        <DialogContent>
          <Box sx={{ display: "grid", gap: 2, pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}

            <Typography variant="body2" color="text.secondary">
              Customer:{" "}
              {followUp.customerNameMasked ||
                followUp.customerReference ||
                "N/A"}
            </Typography>

            <Typography variant="body2">
              Current status: {followUp.status.replaceAll("_", " ")}
            </Typography>

            <TextField
              select
              label="New Status"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as FollowUpStatus)
              }
              disabled={submitting}
              required
              fullWidth
            >
              {statuses.map((value) => (
                <MenuItem key={value} value={value}>
                  {value.replaceAll("_", " ")}
                </MenuItem>
              ))}
            </TextField>

            {status === "RESCHEDULED" && (
<TextField
  label="Next Follow-up Date"
  type="date"
  value={nextFollowUpDate}
  onChange={(event) =>
    setNextFollowUpDate(event.target.value)
  }
  slotProps={{
    inputLabel: {
      shrink: true,
    },
  }}
  required
  disabled={submitting}
  fullWidth
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
              disabled={submitting}
              fullWidth
            />

            <TextField
              label="Status Change Note"
              value={note}
              onChange={(event) =>
                setNote(event.target.value)
              }
              multiline
              minRows={2}
              disabled={submitting}
              fullWidth
              helperText="Reason or explanation for the status change."
            />
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={submitting}>
            Cancel
          </Button>

          <Button
            type="submit"
            variant="contained"
            disabled={submitting || status === followUp.status}
          >
            {submitting ? "Saving..." : "Update Status"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
