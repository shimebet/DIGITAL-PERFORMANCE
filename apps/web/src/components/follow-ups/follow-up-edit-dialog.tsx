import { useState } from "react";
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

import { useQuery } from "@tanstack/react-query";


import { getFollowUpProductsApi } from "../../api/follow-up-products.api";

import type {
  FollowUp,
  FollowUpPriority,
  UpdateFollowUpRequest,
} from "../../types/follow-up.types";

interface Props {
  open: boolean;
  followUp: FollowUp | null;
  onClose: () => void;
  onSubmit: (
    id: string,
    payload: UpdateFollowUpRequest,
  ) => Promise<void>;
  submitting: boolean;
}

const priorities: FollowUpPriority[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
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
    : "An unexpected error occurred.";
}

function toDateInput(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : "";
}

function initialValues(followUp: FollowUp | null) {
  return {

    productId: followUp?.productId ?? "",
    customerReference: followUp?.customerReference ?? "",
    customerNameMasked: followUp?.customerNameMasked ?? "",
    contactReference: followUp?.contactReference ?? "",
    priority: followUp?.priority ?? ("MEDIUM" as FollowUpPriority),
    followUpDate: toDateInput(followUp?.followUpDate),
    reason: followUp?.reason ?? "",
    remarks: followUp?.remarks ?? "",
    outcome: followUp?.outcome ?? "",
  };
}

export function FollowUpEditDialog({
  open,
  followUp,
  onClose,
  onSubmit,
  submitting,
}: Props) {
  const [values, setValues] = useState(() => initialValues(followUp));
  const [error, setError] = useState<string | null>(null);



const productsQuery = useQuery({
    queryKey: ["follow-ups", "product-options"],
    queryFn: getFollowUpProductsApi,
    enabled: open,
    retry: false,
  });

  function update(
    field: keyof ReturnType<typeof initialValues>,
    value: string,
  ) {
    setValues((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!followUp) return;

if (!values.followUpDate) {
      setError("Follow-up date is required.");
      return;
    }

    const reason = values.reason.trim();

    if (reason && !/[A-Za-z]/.test(reason)) {
      setError("Reason must contain descriptive text.");
      return;
    }

    const payload: UpdateFollowUpRequest = {
      priority: values.priority,
      followUpDate: values.followUpDate,
      customerReference: values.customerReference.trim(),
      customerNameMasked: values.customerNameMasked.trim(),
      contactReference: values.contactReference.trim(),
      reason,
      remarks: values.remarks.trim(),
      outcome: values.outcome.trim(),
    };

    if (values.productId) {
      payload.productId = values.productId;
    }

    try {
      await onSubmit(followUp.id, payload);
    } catch (submissionError) {
      setError(errorMessage(submissionError));
    }
  }

  const products = productsQuery.data ?? [];

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
        <DialogTitle>Edit Follow-up</DialogTitle>

        <DialogContent>
          <Box sx={{ display: "grid", gap: 2, pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}

{productsQuery.isError && (
              <Alert severity="warning">
                Product options unavailable: {errorMessage(productsQuery.error)}
              </Alert>
            )}

<TextField
              select
              label="Product"
              value={values.productId}
              onChange={(event) =>
                update("productId", event.target.value)
              }
              disabled={submitting || productsQuery.isLoading || productsQuery.isError}
              fullWidth
            >
              <MenuItem value="">No product</MenuItem>

              {products.map((product) => (
                <MenuItem key={product.id} value={product.id}>
                  {product.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Customer Reference"
              value={values.customerReference}
              onChange={(event) =>
                update("customerReference", event.target.value)
              }
              slotProps={{ htmlInput: { maxLength: 191 } }}
              disabled={submitting}
              fullWidth
            />

            <TextField
              label="Masked Customer Name"
              value={values.customerNameMasked}
              onChange={(event) =>
                update("customerNameMasked", event.target.value)
              }
              slotProps={{ htmlInput: { maxLength: 191 } }}
              disabled={submitting}
              fullWidth
            />

            <TextField
              label="Contact Reference"
              value={values.contactReference}
              onChange={(event) =>
                update("contactReference", event.target.value)
              }
              slotProps={{ htmlInput: { maxLength: 191 } }}
              disabled={submitting}
              fullWidth
            />

            <TextField
              select
              required
              label="Priority"
              value={values.priority}
              onChange={(event) =>
                update("priority", event.target.value)
              }
              disabled={submitting}
              fullWidth
            >
              {priorities.map((priority) => (
                <MenuItem key={priority} value={priority}>
                  {priority}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              required
              label="Follow-up Date"
              type="date"
              value={values.followUpDate}
              onChange={(event) =>
                update("followUpDate", event.target.value)
              }
              slotProps={{
                inputLabel: { shrink: true },
              }}
              disabled={submitting}
              fullWidth
            />

            <TextField
              label="Reason"
              value={values.reason}
              onChange={(event) =>
                update("reason", event.target.value)
              }
              multiline
              minRows={2}
              disabled={submitting}
              fullWidth
            />

            <TextField
              label="Remarks"
              value={values.remarks}
              onChange={(event) =>
                update("remarks", event.target.value)
              }
              multiline
              minRows={2}
              disabled={submitting}
              fullWidth
            />

            <TextField
              label="Outcome"
              value={values.outcome}
              onChange={(event) =>
                update("outcome", event.target.value)
              }
              multiline
              minRows={2}
              disabled={submitting}
              fullWidth
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
            {submitting ? "Saving..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
