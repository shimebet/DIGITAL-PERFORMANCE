import { useEffect } from "react";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";

import { Controller, useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

import {
  returnSubmissionSchema,
  type ReturnSubmissionFormValues,
} from "../../validation/submission.schema";

interface ReturnSubmissionDialogProps {
  open: boolean;

  submitting?: boolean;

  onClose: () => void;

  onSubmit: (values: ReturnSubmissionFormValues) => Promise<void>;
}

export function ReturnSubmissionDialog({
  open,
  submitting = false,
  onClose,
  onSubmit,
}: ReturnSubmissionDialogProps) {
  const { control, handleSubmit, reset } = useForm<ReturnSubmissionFormValues>({
    resolver: zodResolver(returnSubmissionSchema),

    defaultValues: {
      reason: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        reason: "",
      });
    }
  }, [open, reset]);

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>Return for Correction</DialogTitle>

      <DialogContent>
        <Controller
          name="reason"
          control={control}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              fullWidth
              multiline
              minRows={5}
              label="Correction Reason"
              placeholder="Explain what the staff member needs to correct..."
              error={Boolean(fieldState.error)}
              helperText={fieldState.error?.message}
              sx={{
                mt: 1,
              }}
            />
          )}
        />
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,

          pb: 2,
        }}
      >
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>

        <Button
          variant="contained"
          color="warning"
          disabled={submitting}
          onClick={handleSubmit(onSubmit)}
        >
          {submitting ? "Returning..." : "Return Submission"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
