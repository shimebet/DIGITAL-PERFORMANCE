
import { useEffect, useMemo } from "react";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { useQuery } from "@tanstack/react-query";

import { Controller, useForm, useWatch } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

import { getMyActivitiesApi } from "../../api/activities.api";
import { getMySubmissionsApi } from "../../api/submissions.api";

import type { Activity } from "../../types/activity.types";

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
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - offset)
    .toISOString()
    .slice(0, 10);
}

function dateOnly(value: string) {
  return value.slice(0, 10);
}

function numberValue(value: number | undefined) {
  return Number(value ?? 0).toLocaleString();
}

export function CreateSubmissionDialog({
  open,
  onClose,
  onSubmit,
  submitting = false,
}: CreateSubmissionDialogProps) {
  const {
    control,
    handleSubmit,
    reset,
  } = useForm<CreateSubmissionFormValues>({
    resolver: zodResolver(createSubmissionSchema),
    defaultValues: {
      submissionDate: today(),
      remarks: "",
    },
  });

  const selectedDate = useWatch({
    control,
    name: "submissionDate",
  });

  useEffect(() => {
    if (open) {
      reset({
        submissionDate: today(),
        remarks: "",
      });
    }
  }, [open, reset]);

  const activitiesQuery = useQuery({
    queryKey: ["my-activities", "submission-create-preview"],
    queryFn: getMyActivitiesApi,
    enabled: open,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const submissionsQuery = useQuery({
    queryKey: ["my-submissions", "submission-create-preview"],
    queryFn: getMySubmissionsApi,
    enabled: open,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const matchingActivities = useMemo(() => {
    return (activitiesQuery.data ?? []).filter(
      (activity) => dateOnly(activity.activityDate) === selectedDate,
    );
  }, [activitiesQuery.data, selectedDate]);

  const existingSubmission = useMemo(() => {
    return (submissionsQuery.data ?? []).find(
      (submission) =>
        dateOnly(submission.submissionDate) === selectedDate,
    );
  }, [submissionsQuery.data, selectedDate]);

  const totals = useMemo(() => {
    return matchingActivities.reduce(
      (result, activity) => ({
        customerVisits: result.customerVisits + activity.customerVisits,
        phoneCalls: result.phoneCalls + activity.phoneCalls,
        customersContacted:
          result.customersContacted + activity.customersContacted,
        customersEducated:
          result.customersEducated + activity.customersEducated,
        activations: result.activations + activity.activations,
        reactivations: result.reactivations + activity.reactivations,
        transactions: result.transactions + activity.transactions,
      }),
      {
        customerVisits: 0,
        phoneCalls: 0,
        customersContacted: 0,
        customersEducated: 0,
        activations: 0,
        reactivations: 0,
        transactions: 0,
      },
    );
  }, [matchingActivities]);

  const loading =
    activitiesQuery.isPending ||
    submissionsQuery.isPending ||
    activitiesQuery.isFetching ||
    submissionsQuery.isFetching;

  const loadError =
    activitiesQuery.isError || submissionsQuery.isError;

  const alreadyLinked = matchingActivities.some(
    (activity) => Boolean(activity.submissionId),
  );

  const canCreate =
    !submitting &&
    !loading &&
    !loadError &&
    Boolean(selectedDate) &&
    matchingActivities.length > 0 &&
    !existingSubmission &&
    !alreadyLinked;

  async function submitForm(values: CreateSubmissionFormValues) {
    if (!canCreate) {
      return;
    }

    // Recheck the latest records before submitting.
    const [activitiesResult, submissionsResult] = await Promise.all([
      activitiesQuery.refetch(),
      submissionsQuery.refetch(),
    ]);

    if (
      activitiesResult.isError ||
      submissionsResult.isError ||
      !activitiesResult.data ||
      !submissionsResult.data
    ) {
      return;
    }

    const currentActivities = activitiesResult.data.filter(
      (activity: Activity) =>
        dateOnly(activity.activityDate) === values.submissionDate,
    );

    const duplicateSubmission = submissionsResult.data.some(
      (submission) =>
        dateOnly(submission.submissionDate) === values.submissionDate,
    );

    if (
      currentActivities.length === 0 ||
      duplicateSubmission ||
      currentActivities.some((activity) => Boolean(activity.submissionId))
    ) {
      return;
    }

    await onSubmit(values);
  }

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>Create Daily Submission</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
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
                  inputLabel: { shrink: true },
                }}
              />
            )}
          />

          <Divider />

          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Existing Activities for Selected Date
          </Typography>

          {loading && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <CircularProgress size={20} />
              <Typography variant="body2">
                Checking existing activities and submissions...
              </Typography>
            </Box>
          )}

          {!loading && loadError && (
            <Alert severity="error">
              Unable to load activities or submissions. Please retry.
            </Alert>
          )}

          {!loading && !loadError && existingSubmission && (
            <Alert severity="warning">
              A daily submission already exists for {selectedDate}.
              Current status: {existingSubmission.status}.
              Another draft cannot be created for this date.
            </Alert>
          )}

          {!loading &&
            !loadError &&
            !existingSubmission &&
            matchingActivities.length === 0 && (
              <Alert severity="warning">
                No activity has been recorded for {selectedDate}.
                Please record or import the activity before creating
                the daily submission.
              </Alert>
            )}

          {!loading &&
            !loadError &&
            !existingSubmission &&
            alreadyLinked && (
              <Alert severity="warning">
                An activity on this date is already linked to a submission.
                Please review the existing submission.
              </Alert>
            )}

          {!loading &&
            !loadError &&
            matchingActivities.length > 0 && (
              <Stack spacing={2}>
                <Alert severity="success">
                  {matchingActivities.length} existing activity record(s)
                  found for {selectedDate}.
                </Alert>

                <Box
                  sx={{
                    p: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 600, mb: 2 }}
                  >
                    Daily Performance Summary
                  </Typography>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "repeat(2, minmax(0, 1fr))",
                        sm: "repeat(4, minmax(0, 1fr))",
                      },
                      gap: 2,
                    }}
                  >
                    {[
                      ["Customer Visits", totals.customerVisits],
                      ["Phone Calls", totals.phoneCalls],
                      ["Contacted", totals.customersContacted],
                      ["Educated", totals.customersEducated],
                      ["Activations", totals.activations],
                      ["Reactivations", totals.reactivations],
                      ["Transactions", totals.transactions],
                    ].map(([label, value]) => (
                      <Box key={String(label)}>
                        <Typography variant="caption" color="text.secondary">
                          {label}
                        </Typography>
                        <Typography
                          variant="h6"
                          sx={{ fontWeight: 600 }}
                        >
                          {numberValue(Number(value))}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>

                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 600 }}
                >
                  Product Performance
                </Typography>

                {matchingActivities.map((activity) => (
                  <Box
                    key={activity.id}
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 2,
                      overflow: "hidden",
                    }}
                  >
                    <Box sx={{ p: 2, bgcolor: "action.hover" }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {dateOnly(activity.activityDate)}
                        {activity.branch?.name
                          ? ` — ${activity.branch.name}`
                          : ""}
                      </Typography>
                    </Box>

                    <Box sx={{ overflowX: "auto" }}>
                      <Box
                        component="table"
                        sx={{
                          width: "100%",
                          borderCollapse: "collapse",
                          "& th, & td": {
                            px: 1.5,
                            py: 1,
                            borderBottom: "1px solid",
                            borderColor: "divider",
                            textAlign: "left",
                            fontSize: 13,
                          },
                        }}
                      >
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>Engaged</th>
                            <th>Activations</th>
                            <th>Reactivations</th>
                            <th>Transactions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activity.products.map((product) => (
                            <tr key={product.id ?? product.productId}>
                              <td>
                                {product.product?.name ??
                                  product.product?.code ??
                                  product.productId}
                              </td>
                              <td>{numberValue(product.customersEngaged)}</td>
                              <td>{numberValue(product.activations)}</td>
                              <td>{numberValue(product.reactivations)}</td>
                              <td>{numberValue(product.transactions)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Stack>
            )}

          <Divider />

          <Controller
            name="remarks"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                fullWidth
                multiline
                minRows={3}
                label="Remarks"
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
              />
            )}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>

        <Button
          variant="contained"
          disabled={!canCreate}
          onClick={handleSubmit(submitForm)}
        >
          {submitting ? "Creating..." : "Create Draft"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
