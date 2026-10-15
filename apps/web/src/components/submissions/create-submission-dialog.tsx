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
  createSubmissionSchema,
  type CreateSubmissionFormValues,
} from "../../validation/submission.schema";

interface CreateSubmissionDialogProps {
  open: boolean;

  onClose: () => void;

  onSubmit: (values: CreateSubmissionFormValues) => Promise<void>;

  submitting?: boolean;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function CreateSubmissionDialog({
  open,
  onClose,
  onSubmit,
  submitting = false,
}: CreateSubmissionDialogProps) {
  const { control, handleSubmit, reset } = useForm<CreateSubmissionFormValues>({
    resolver: zodResolver(createSubmissionSchema),

    defaultValues: {
      submissionDate: today(),

      remarks: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        submissionDate: today(),

        remarks: "",
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
      <DialogTitle>Create Daily Submission</DialogTitle>

      <DialogContent>
        <Controller
          name="submissionDate"
          control={control}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              fullWidth
              type="date"
              label="Submission Date"
              error={Boolean(fieldState.error)}
              helperText={fieldState.error?.message}
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
              sx={{
                mt: 1,

                mb: 2,
              }}
            />
          )}
        />

        <Controller
          name="remarks"
          control={control}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              fullWidth
              multiline
              minRows={4}
              label="Remarks"
              error={Boolean(fieldState.error)}
              helperText={fieldState.error?.message}
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
          disabled={submitting}
          onClick={handleSubmit(onSubmit)}
        >
          {submitting ? "Creating..." : "Create Draft"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
