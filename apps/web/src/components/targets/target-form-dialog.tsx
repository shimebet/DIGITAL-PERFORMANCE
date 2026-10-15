import {
  useEffect,
} from "react";

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
} from "@mui/material";

import {
  Controller,
  useForm,
} from "react-hook-form";

import {
  zodResolver,
} from "@hookform/resolvers/zod";

import {
  targetSchema,
} from "../../validation/target.schema";

import type {
  TargetFormValues,
} from "../../validation/target.schema";

import type {
  Target,
} from "../../types/target.types";

// ============================================================================
// PROPS
// ============================================================================

interface TargetFormDialogProps {
  open: boolean;

  target?: Target | null;

  submitting?: boolean;

  error?: string | null;

  onClose: () => void;

  onSubmit: (
    values: TargetFormValues,
  ) => Promise<void> | void;
}

// ============================================================================
// DATE HELPERS
// ============================================================================

function today() {
  return new Date()
    .toISOString()
    .slice(
      0,
      10,
    );
}

function monthEnd() {
  const now =
    new Date();

  const date =
    new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    );

  return date
    .toISOString()
    .slice(
      0,
      10,
    );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TargetFormDialog({
  open,
  target,
  submitting = false,
  error,
  onClose,
  onSubmit,
}: TargetFormDialogProps) {
  const editing =
    Boolean(target);

  const {
    control,
    handleSubmit,
    reset,

    formState: {
      errors,
    },
  } =
    useForm<TargetFormValues>({
      resolver:
        zodResolver(
          targetSchema,
        ),

      defaultValues: {
        name: "",

        description: "",

        metricType:
          "ACTIVATION",

        periodType:
          "MONTHLY",

        startDate:
          today(),

        endDate:
          monthEnd(),

        defaultTargetValue:
          0,
      },
    });

  // ==========================================================================
  // LOAD VALUES
  // ==========================================================================

  useEffect(() => {
    if (!open) {
      return;
    }

    if (target) {
      reset({
        name:
          target.name,

        description:
          target.description ??
          "",

        metricType:
          target.metricType,

        periodType:
          target.periodType,

        startDate:
          target.startDate.slice(
            0,
            10,
          ),

        endDate:
          target.endDate.slice(
            0,
            10,
          ),

        defaultTargetValue:
          Number(
            target.defaultTargetValue ??
              0,
          ),
      });

      return;
    }

    reset({
      name: "",

      description: "",

      metricType:
        "ACTIVATION",

      periodType:
        "MONTHLY",

      startDate:
        today(),

      endDate:
        monthEnd(),

      defaultTargetValue:
        0,
    });
  }, [
    open,
    target,
    reset,
  ]);

  // ==========================================================================
  // SUBMIT
  // ==========================================================================

  async function submit(
    values: TargetFormValues,
  ) {
    await onSubmit(
      values,
    );
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <Dialog
      open={open}
      onClose={
        submitting
          ? undefined
          : onClose
      }
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>
        {editing
          ? "Edit Target"
          : "Create Target"}
      </DialogTitle>

      <DialogContent>
        <Box
          sx={{
            pt: 1,

            display:
              "grid",

            gap: 2,
          }}
        >
          {error && (
            <Alert severity="error">
              {error}
            </Alert>
          )}

          <Controller
            name="name"
            control={control}
            render={({
              field,
            }) => (
              <TextField
                {...field}
                fullWidth
                label="Target Name"
                error={
                  Boolean(
                    errors.name,
                  )
                }
                helperText={
                  errors.name
                    ?.message
                }
              />
            )}
          />

          <Controller
            name="description"
            control={control}
            render={({
              field,
            }) => (
              <TextField
                {...field}
                fullWidth
                multiline
                minRows={3}
                label="Description"
              />
            )}
          />

          <Box
            sx={{
              display:
                "grid",

              gridTemplateColumns: {
                xs:
                  "1fr",

                md:
                  "repeat(2, minmax(0, 1fr))",
              },

              gap: 2,
            }}
          >
            <Controller
              name="metricType"
              control={control}
              render={({
                field,
              }) => (
                <TextField
                  {...field}
                  select
                  fullWidth
                  label="Metric Type"
                  error={
                    Boolean(
                      errors.metricType,
                    )
                  }
                  helperText={
                    errors.metricType
                      ?.message
                  }
                >
                  <MenuItem value="CUSTOMER_VISIT">
                    Customer Visit
                  </MenuItem>

                  <MenuItem value="PHONE_CALL">
                    Phone Call
                  </MenuItem>

                  <MenuItem value="CUSTOMER_CONTACT">
                    Customer Contact
                  </MenuItem>

                  <MenuItem value="CUSTOMER_ENGAGEMENT">
                    Customer Engagement
                  </MenuItem>

                  <MenuItem value="ACTIVATION">
                    Activation
                  </MenuItem>

                  <MenuItem value="REACTIVATION">
                    Reactivation
                  </MenuItem>

                  <MenuItem value="TRANSACTION">
                    Transaction
                  </MenuItem>

                  <MenuItem value="FOLLOW_UP">
                    Follow-up
                  </MenuItem>

                  <MenuItem value="CONVERSION_RATE">
                    Conversion Rate
                  </MenuItem>

                  <MenuItem value="ACHIEVEMENT_RATE">
                    Achievement Rate
                  </MenuItem>
                </TextField>
              )}
            />

            <Controller
              name="periodType"
              control={control}
              render={({
                field,
              }) => (
                <TextField
                  {...field}
                  select
                  fullWidth
                  label="Period"
                  error={
                    Boolean(
                      errors.periodType,
                    )
                  }
                  helperText={
                    errors.periodType
                      ?.message
                  }
                >
                  <MenuItem value="DAILY">
                    Daily
                  </MenuItem>

                  <MenuItem value="WEEKLY">
                    Weekly
                  </MenuItem>

                  <MenuItem value="MONTHLY">
                    Monthly
                  </MenuItem>

                  <MenuItem value="QUARTERLY">
                    Quarterly
                  </MenuItem>

                  <MenuItem value="YEARLY">
                    Yearly
                  </MenuItem>

                  <MenuItem value="CUSTOM">
                    Custom
                  </MenuItem>
                </TextField>
              )}
            />
          </Box>

          <Box
            sx={{
              display:
                "grid",

              gridTemplateColumns: {
                xs:
                  "1fr",

                md:
                  "repeat(2, minmax(0, 1fr))",
              },

              gap: 2,
            }}
          >
            <Controller
              name="startDate"
              control={control}
              render={({
                field,
              }) => (
                <TextField
                  {...field}
                  fullWidth
                  type="date"
                  label="Start Date"
                  error={
                    Boolean(
                      errors.startDate,
                    )
                  }
                  helperText={
                    errors.startDate
                      ?.message
                  }
                  slotProps={{
                    inputLabel: {
                      shrink:
                        true,
                    },
                  }}
                />
              )}
            />

            <Controller
              name="endDate"
              control={control}
              render={({
                field,
              }) => (
                <TextField
                  {...field}
                  fullWidth
                  type="date"
                  label="End Date"
                  error={
                    Boolean(
                      errors.endDate,
                    )
                  }
                  helperText={
                    errors.endDate
                      ?.message
                  }
                  slotProps={{
                    inputLabel: {
                      shrink:
                        true,
                    },
                  }}
                />
              )}
            />
          </Box>

          <Controller
            name="defaultTargetValue"
            control={control}
            render={({
              field,
            }) => (
              <TextField
                {...field}
                fullWidth
                type="number"
                label="Default Target Value"
                error={
                  Boolean(
                    errors.defaultTargetValue,
                  )
                }
                helperText={
                  errors.defaultTargetValue
                    ?.message ??
                  "Used as the default target value when appropriate."
                }
                onChange={(
                  event,
                ) =>
                  field.onChange(
                    Number(
                      event.target
                        .value,
                    ),
                  )
                }
              />
            )}
          />
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,

          py: 2,
        }}
      >
        <Button
          onClick={onClose}
          disabled={
            submitting
          }
        >
          Cancel
        </Button>

        <Button
          variant="contained"
          disabled={
            submitting
          }
          onClick={
            handleSubmit(
              submit,
            )
          }
        >
          {submitting
            ? "Saving..."
            : editing
              ? "Update Target"
              : "Create Target"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}