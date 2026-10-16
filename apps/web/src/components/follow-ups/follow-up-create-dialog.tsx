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
  Typography,
} from "@mui/material";

import { useQuery } from "@tanstack/react-query";

import { getFollowUpStaffApi } from "../../api/follow-up-staff.api";
import { getFollowUpProductsApi } from "../../api/follow-up-products.api";

import type {
  CreateFollowUpRequest,
  FollowUpPriority,
} from "../../types/follow-up.types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateFollowUpRequest) => Promise<void>;
  submitting: boolean;
}

const priorities: FollowUpPriority[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
];

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;

    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string") return message;

    return error.message;
  }

  return error instanceof Error
    ? error.message
    : "Unable to load selection options.";
}

function todayInEthiopia() {
  return new Date(Date.now() + 3 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

function initialValues(): CreateFollowUpRequest {
  return {
    assignedToUserId: "",
    priority: "MEDIUM",
    followUpDate: todayInEthiopia(),
    customerReference: "",
    customerNameMasked: "",
    contactReference: "",
    reason: "",
    remarks: "",
  };
}

export function FollowUpCreateDialog({
  open,
  onClose,
  onSubmit,
  submitting,
}: Props) {
  const [values, setValues] = useState(initialValues);
  const [error, setError] = useState<string | null>(null);

  const staffQuery = useQuery({
    queryKey: ["follow-ups", "staff-options"],
    queryFn: getFollowUpStaffApi,
    enabled: open,
    retry: false,
  });

  const productsQuery = useQuery({
    queryKey: ["follow-ups", "product-options"],
    queryFn: getFollowUpProductsApi,
    enabled: open,
    retry: false,
  });

  function update<K extends keyof CreateFollowUpRequest>(
    field: K,
    value: CreateFollowUpRequest[K],
  ) {
    setValues((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function close() {
    if (submitting) return;

    setError(null);
    setValues(initialValues());
    onClose();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!values.assignedToUserId) {
      setError("Please select an assigned staff member.");
      return;
    }

    if (!values.followUpDate) {
      setError("Follow-up date is required.");
      return;
    }

    const reason = values.reason?.trim() ?? "";

    if (reason && !/[A-Za-z]/.test(reason)) {
      setError(
        "Reason must contain descriptive text, not numbers only.",
      );
      return;
    }

    const payload: CreateFollowUpRequest = {
      assignedToUserId: values.assignedToUserId,
      priority: values.priority,
      followUpDate: values.followUpDate,

      ...(values.productId
        ? { productId: values.productId }
        : {}),

      ...(values.customerReference?.trim()
        ? { customerReference: values.customerReference.trim() }
        : {}),

      ...(values.customerNameMasked?.trim()
        ? { customerNameMasked: values.customerNameMasked.trim() }
        : {}),

      ...(values.contactReference?.trim()
        ? { contactReference: values.contactReference.trim() }
        : {}),

      ...(values.reason?.trim()
        ? { reason: values.reason.trim() }
        : {}),

      ...(values.remarks?.trim()
        ? { remarks: values.remarks.trim() }
        : {}),
    };

    try {
      await onSubmit(payload);
      setValues(initialValues());
    } catch (submissionError) {
      setError(getErrorMessage(submissionError));
    }
  }

  const staff = staffQuery.data ?? [];
  const products = productsQuery.data ?? [];

  return (
    <Dialog
      open={open}
      onClose={close}
      fullWidth
      maxWidth="sm"
    >
      <Box component="form" onSubmit={submit}>
        <DialogTitle>Create Follow-up</DialogTitle>

        <DialogContent>
          <Box
            sx={{
              display: "grid",
              gap: 2,
              pt: 1,
            }}
          >
            {error && (
              <Alert severity="error">{error}</Alert>
            )}

            {staffQuery.isError && (
              <Alert severity="warning">
                Staff options could not be loaded:{" "}
                {getErrorMessage(staffQuery.error)}
              </Alert>
            )}

            {productsQuery.isError && (
              <Alert severity="warning">
                Product options could not be loaded:{" "}
                {getErrorMessage(productsQuery.error)}
              </Alert>
            )}

            <TextField
              select
              required
              fullWidth
              label="Assigned Staff"
              value={values.assignedToUserId}
              onChange={(event) =>
                update("assignedToUserId", event.target.value)
              }
              disabled={
                submitting ||
                staffQuery.isLoading ||
                staffQuery.isError
              }
              helperText={
                staffQuery.isLoading
                  ? "Loading staff..."
                  : staff.length === 0
                    ? "No eligible staff available."
                    : "Select an active branch staff member."
              }
            >
              {staff.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.firstName} {user.lastName} ({user.username})
                  {user.staffProfile?.branch?.name
                    ? ` - ${user.staffProfile.branch.name}`
                    : ""}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              fullWidth
              label="Product"
              value={values.productId ?? ""}
              onChange={(event) =>
                update("productId", event.target.value)
              }
              disabled={
                submitting ||
                productsQuery.isLoading ||
                productsQuery.isError
              }
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
              value={values.customerReference ?? ""}
              onChange={(event) =>
                update("customerReference", event.target.value)
              }
              slotProps={{ htmlInput: { maxLength: 191 } }}
              fullWidth
              disabled={submitting}
            />

            <TextField
              label="Masked Customer Name"
              value={values.customerNameMasked ?? ""}
              onChange={(event) =>
                update("customerNameMasked", event.target.value)
              }
              slotProps={{ htmlInput: { maxLength: 191 } }}
              helperText="Use a masked identifier, not the customer's full name."
              fullWidth
              disabled={submitting}
            />

            <TextField
              label="Contact Reference"
              value={values.contactReference ?? ""}
              onChange={(event) =>
                update("contactReference", event.target.value)
              }
              slotProps={{ htmlInput: { maxLength: 191 } }}
              fullWidth
              disabled={submitting}
            />

            <TextField
              select
              required
              label="Priority"
              value={values.priority}
              onChange={(event) =>
                update(
                  "priority",
                  event.target.value as FollowUpPriority,
                )
              }
              fullWidth
              disabled={submitting}
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
              fullWidth
              disabled={submitting}
            />

            <TextField
              label="Reason"
              value={values.reason ?? ""}
              onChange={(event) =>
                update("reason", event.target.value)
              }
              multiline
              minRows={2}
              fullWidth
              disabled={submitting}
            />

            <TextField
              label="Remarks"
              value={values.remarks ?? ""}
              onChange={(event) =>
                update("remarks", event.target.value)
              }
              multiline
              minRows={2}
              fullWidth
              disabled={submitting}
            />

            <Typography variant="caption" color="text.secondary">
              The backend validates staff assignment, branch
              access, product availability, and permissions.
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={close} disabled={submitting}>
            Cancel
          </Button>

          <Button
            type="submit"
            variant="contained"
            disabled={
              submitting ||
              staffQuery.isLoading ||
              staffQuery.isError ||
              staff.length === 0
            }
            startIcon={
              submitting
                ? <CircularProgress size={16} />
                : undefined
            }
          >
            {submitting ? "Saving..." : "Create Follow-up"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}


