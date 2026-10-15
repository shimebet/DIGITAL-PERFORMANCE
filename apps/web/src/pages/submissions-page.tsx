import { useMemo, useState } from "react";

import axios from "axios";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";

import { AddOutlined, RefreshOutlined } from "@mui/icons-material";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useNavigate } from "react-router-dom";

import {
  approveSubmissionApi,
  createSubmissionApi,
  getMySubmissionsApi,
  getSubmissionsApi,
  reviewSubmissionApi,
  returnSubmissionApi,
  submitSubmissionApi,
} from "../api/submissions.api";

import { CreateSubmissionDialog } from "../components/submissions/create-submission-dialog";

import { ManagerSubmissionTable } from "../components/submissions/manager-submission-table";

import { ReturnSubmissionDialog } from "../components/submissions/return-submission-dialog";

import { SubmissionDetailsDialog } from "../components/submissions/submission-details-dialog";

import { SubmissionTable } from "../components/submissions/submission-table";

import { useAuthStore } from "../stores/auth.store";

import type {
  DailySubmission,
  SubmissionStatus,
} from "../types/submission.types";

import type {
  CreateSubmissionFormValues,
  ReturnSubmissionFormValues,
} from "../validation/submission.schema";

// ============================================================================
// DATE HELPERS
// ============================================================================

function today() {
  return new Date().toISOString().slice(0, 10);
}

function monthStart() {
  const date = new Date();

  return new Date(date.getFullYear(), date.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;

    if (Array.isArray(message)) {
      return message.join(", ");
    }

    if (typeof message === "string") {
      return message;
    }

    if (error.response?.status) {
      return `Request failed with status ${error.response.status}.`;
    }

    return error.message || "Unable to communicate with the server.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
}

// ============================================================================
// PAGE
// ============================================================================

export function SubmissionsPage() {
  const queryClient = useQueryClient();

  const navigate = useNavigate();

  // ==========================================================================
  // AUTHORIZATION
  // ==========================================================================

  const user = useAuthStore((state) => state.user);

  const hasPermission = useAuthStore((state) => state.hasPermission);

  const isDigitalStaff =
    user?.roles?.includes("DIGITAL_RESKILLED_STAFF") ?? false;

  const isSuperAdmin = user?.roles?.includes("SUPER_ADMIN") ?? false;

  const canRead = hasPermission("submission.read");

  const canSubmit = hasPermission("submission.submit");

  const canReview = hasPermission("submission.review");

  const canApprove = hasPermission("submission.approve");

  const canCreateDraft = isDigitalStaff && canSubmit;

  const useManagementView = !isDigitalStaff;

  // ==========================================================================
  // FILTER STATE
  // ==========================================================================

  const [startDate, setStartDate] = useState(monthStart());

  const [endDate, setEndDate] = useState(today());

  const [status, setStatus] = useState<SubmissionStatus | "">("");

  // ==========================================================================
  // DIALOG STATE
  // ==========================================================================

  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const [returnDialogOpen, setReturnDialogOpen] = useState(false);

  const [selectedSubmission, setSelectedSubmission] =
    useState<DailySubmission | null>(null);

  const [returnSubmission, setReturnSubmission] =
    useState<DailySubmission | null>(null);

  // ==========================================================================
  // FEEDBACK STATE
  // ==========================================================================

  const [actionError, setActionError] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [processingId, setProcessingId] = useState<string | null>(null);

  // ==========================================================================
  // QUERY
  // ==========================================================================

  const submissionsQuery = useQuery({
    queryKey: [
      "submissions",

      useManagementView ? "scoped" : "mine",

      {
        startDate,
        endDate,
        status,
      },
    ],

    enabled: canRead || isSuperAdmin,

    queryFn: async () => {
      if (isDigitalStaff) {
        return getMySubmissionsApi();
      }

      return getSubmissionsApi({
        startDate: startDate || undefined,

        endDate: endDate || undefined,

        status: status || undefined,
      });
    },
  });

  // ==========================================================================
  // VISIBLE SUBMISSIONS
  // ==========================================================================

  const visibleSubmissions = useMemo(() => {
    const rows = submissionsQuery.data ?? [];

    if (useManagementView) {
      return rows;
    }

    return rows.filter((submission) => {
      const date = submission.submissionDate.slice(0, 10);

      if (startDate && date < startDate) {
        return false;
      }

      if (endDate && date > endDate) {
        return false;
      }

      if (status && submission.status !== status) {
        return false;
      }

      return true;
    });
  }, [submissionsQuery.data, useManagementView, startDate, endDate, status]);

  // ==========================================================================
  // COMMON HELPERS
  // ==========================================================================

  async function refreshSubmissionData() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["submissions"],
      }),

      queryClient.invalidateQueries({
        queryKey: ["activities"],
      }),

      queryClient.invalidateQueries({
        queryKey: ["dashboard-overview"],
      }),
    ]);
  }

  function clearMessages() {
    setActionError(null);

    setSuccessMessage(null);
  }

  // ==========================================================================
  // CREATE DRAFT
  // ==========================================================================

  const createMutation = useMutation({
    mutationFn: (values: CreateSubmissionFormValues) =>
      createSubmissionApi({
        submissionDate: values.submissionDate,

        remarks: values.remarks?.trim() || undefined,
      }),

    onMutate: () => {
      clearMessages();
    },

    onSuccess: async () => {
      setCreateDialogOpen(false);

      setSuccessMessage(
        "Daily submission draft created successfully. Add activities using the same date before submitting.",
      );

      await refreshSubmissionData();
    },

    onError: (error) => {
      setActionError(getErrorMessage(error));
    },
  });

  // ==========================================================================
  // SUBMIT / RESUBMIT
  // ==========================================================================

  const submitMutation = useMutation({
    mutationFn: (id: string) => submitSubmissionApi(id),

    onMutate: (id) => {
      clearMessages();

      setProcessingId(id);
    },

    onSuccess: async (result) => {
      setSuccessMessage(
        result.status === "RESUBMITTED"
          ? "Daily report resubmitted successfully."
          : "Daily report submitted successfully.",
      );

      await refreshSubmissionData();
    },

    onError: (error) => {
      setActionError(getErrorMessage(error));
    },

    onSettled: () => {
      setProcessingId(null);
    },
  });

  // ==========================================================================
  // REVIEW
  // ==========================================================================

  const reviewMutation = useMutation({
    mutationFn: (id: string) => reviewSubmissionApi(id),

    onMutate: (id) => {
      clearMessages();

      setProcessingId(id);
    },

    onSuccess: async () => {
      setSuccessMessage("Submission marked as reviewed successfully.");

      closeDetailsDialog();

      await refreshSubmissionData();
    },

    onError: (error) => {
      setActionError(getErrorMessage(error));
    },

    onSettled: () => {
      setProcessingId(null);
    },
  });

  // ==========================================================================
  // APPROVE
  // ==========================================================================

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveSubmissionApi(id),

    onMutate: (id) => {
      clearMessages();

      setProcessingId(id);
    },

    onSuccess: async () => {
      setSuccessMessage("Submission approved successfully.");

      closeDetailsDialog();

      await refreshSubmissionData();
    },

    onError: (error) => {
      setActionError(getErrorMessage(error));
    },

    onSettled: () => {
      setProcessingId(null);
    },
  });

  // ==========================================================================
  // RETURN FOR CORRECTION
  // ==========================================================================

  const returnMutation = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;

      values: ReturnSubmissionFormValues;
    }) =>
      returnSubmissionApi(id, {
        reason: values.reason.trim(),
      }),

    onMutate: ({ id }) => {
      clearMessages();

      setProcessingId(id);
    },

    onSuccess: async () => {
      setReturnDialogOpen(false);

      setReturnSubmission(null);

      closeDetailsDialog();

      setSuccessMessage(
        "Submission returned to the staff member for correction.",
      );

      await refreshSubmissionData();
    },

    onError: (error) => {
      setActionError(getErrorMessage(error));
    },

    onSettled: () => {
      setProcessingId(null);
    },
  });

  // ==========================================================================
  // ACTION HANDLERS
  // ==========================================================================

  function openCreateDraft() {
    clearMessages();

    setCreateDialogOpen(true);
  }

  function viewSubmission(submission: DailySubmission) {
    clearMessages();

    setSelectedSubmission(submission);

    setDetailsDialogOpen(true);
  }

  function closeDetailsDialog() {
    setDetailsDialogOpen(false);

    setSelectedSubmission(null);
  }

  function correctSubmissionActivity(submission: DailySubmission) {
    closeDetailsDialog();

    navigate("/activities", {
      state: {
        correctionSubmissionId: submission.id,

        correctionDate: submission.submissionDate.slice(0, 10),

        returnReason: submission.returnReason ?? null,
      },
    });
  }

  async function submitReport(submission: DailySubmission) {
    clearMessages();

    if (submission.activities.length === 0) {
      setActionError(
        "At least one activity must be added before submitting this daily report.",
      );

      return;
    }

    const isResubmission = submission.status === "RETURNED_FOR_CORRECTION";

    const confirmed = window.confirm(
      isResubmission
        ? "Are you sure you want to resubmit this corrected daily report?"
        : "Are you sure you want to submit this daily report for management review?",
    );

    if (!confirmed) {
      return;
    }

    await submitMutation.mutateAsync(submission.id);
  }

  async function reviewSubmission(submission: DailySubmission) {
    clearMessages();

    const confirmed = window.confirm("Mark this submission as reviewed?");

    if (!confirmed) {
      return;
    }

    await reviewMutation.mutateAsync(submission.id);
  }

  async function approveSubmission(submission: DailySubmission) {
    clearMessages();

    const confirmed = window.confirm("Approve this submission?");

    if (!confirmed) {
      return;
    }

    await approveMutation.mutateAsync(submission.id);
  }

  function openReturnDialog(submission: DailySubmission) {
    clearMessages();

    setReturnSubmission(submission);

    setReturnDialogOpen(true);
  }

  function closeReturnDialog() {
    if (returnMutation.isPending) {
      return;
    }

    setReturnDialogOpen(false);

    setReturnSubmission(null);
  }

  function resetFilters() {
    setStartDate(monthStart());

    setEndDate(today());

    setStatus("");
  }

  // ==========================================================================
  // PAGE MODE
  // ==========================================================================

  const pageTitle = isDigitalStaff
    ? "Daily Submissions"
    : canReview || canApprove
      ? "Submission Review Inbox"
      : "Submissions";

  const pageDescription = isDigitalStaff
    ? "Prepare, submit and track your daily digital performance reports."
    : canReview || canApprove
      ? "Review and manage staff submissions within your organizational scope."
      : "Monitor submissions within your assigned organizational scope.";

  // ==========================================================================
  // ACCESS CHECK
  // ==========================================================================

  if (!canRead && !isSuperAdmin) {
    return (
      <Box
        sx={{
          p: {
            xs: 2,

            md: 3,
          },
        }}
      >
        <Alert severity="error">
          You do not have permission to view submissions.
        </Alert>
      </Box>
    );
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <Box
      sx={{
        p: {
          xs: 2,

          md: 3,
        },
      }}
    >
      {/* HEADER */}

      <Box
        sx={{
          display: "flex",

          flexDirection: {
            xs: "column",

            sm: "row",
          },

          justifyContent: "space-between",

          alignItems: {
            xs: "stretch",

            sm: "center",
          },

          gap: 2,

          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4">{pageTitle}</Typography>

          <Typography
            color="text.secondary"
            sx={{
              mt: 0.5,
            }}
          >
            {pageDescription}
          </Typography>
        </Box>

        {canCreateDraft && (
          <Button
            variant="contained"
            startIcon={<AddOutlined />}
            onClick={openCreateDraft}
          >
            Create Daily Draft
          </Button>
        )}
      </Box>

      {/* USER / MODE */}

      <Card
        elevation={0}
        sx={{
          mb: 3,

          border: "1px solid",

          borderColor: "divider",
        }}
      >
        <CardContent>
          <Box
            sx={{
              display: "grid",

              gridTemplateColumns: {
                xs: "1fr",

                md: "repeat(2, minmax(0, 1fr))",
              },

              gap: 2,
            }}
          >
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Logged in as
              </Typography>

              <Typography
                sx={{
                  fontWeight: 600,
                }}
              >
                {user ? `${user.firstName} ${user.lastName}` : "-"}
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Current View
              </Typography>

              <Typography
                sx={{
                  fontWeight: 600,
                }}
              >
                {isDigitalStaff
                  ? "My Daily Reports"
                  : canReview || canApprove
                    ? "Management Review Inbox"
                    : "Scoped Read-Only Monitoring"}
              </Typography>
            </Box>
          </Box>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 2,
            }}
          >
            {isDigitalStaff
              ? "Create the daily draft first, then enter activities using the same date before submitting the report."
              : "Submission visibility is restricted by your assigned organizational scope."}
          </Typography>
        </CardContent>
      </Card>

      {/* FILTERS */}

      <Card
        elevation={0}
        sx={{
          mb: 3,

          border: "1px solid",

          borderColor: "divider",
        }}
      >
        <CardContent>
          <Typography
            variant="subtitle1"
            sx={{
              mb: 2,

              fontWeight: 600,
            }}
          >
            Filters
          </Typography>

          <Box
            sx={{
              display: "grid",

              gridTemplateColumns: {
                xs: "1fr",

                sm: "repeat(2, minmax(0, 1fr))",

                lg: "repeat(3, minmax(0, 1fr)) auto",
              },

              gap: 2,

              alignItems: "center",
            }}
          >
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Start Date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
            />

            <TextField
              fullWidth
              size="small"
              type="date"
              label="End Date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
            />

            <TextField
              select
              fullWidth
              size="small"
              label="Status"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as SubmissionStatus | "")
              }
            >
              <MenuItem value="">All Statuses</MenuItem>

              <MenuItem value="DRAFT">Draft</MenuItem>

              <MenuItem value="SUBMITTED">Submitted</MenuItem>

              <MenuItem value="RESUBMITTED">Resubmitted</MenuItem>

              <MenuItem value="REVIEWED">Reviewed</MenuItem>

              <MenuItem value="APPROVED">Approved</MenuItem>

              <MenuItem value="RETURNED_FOR_CORRECTION">
                Returned for Correction
              </MenuItem>
            </TextField>

            <Button
              variant="outlined"
              startIcon={<RefreshOutlined />}
              onClick={resetFilters}
            >
              Reset
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* FEEDBACK */}

      {successMessage && (
        <Alert
          severity="success"
          sx={{
            mb: 3,
          }}
          onClose={() => setSuccessMessage(null)}
        >
          {successMessage}
        </Alert>
      )}

      {actionError && (
        <Alert
          severity="error"
          sx={{
            mb: 3,
          }}
          onClose={() => setActionError(null)}
        >
          {actionError}
        </Alert>
      )}

      {submissionsQuery.isError && (
        <Alert
          severity="error"
          sx={{
            mb: 3,
          }}
        >
          {getErrorMessage(submissionsQuery.error)}
        </Alert>
      )}

      {/* TABLE */}

      <Card
        elevation={0}
        sx={{
          border: "1px solid",

          borderColor: "divider",
        }}
      >
        <CardContent>
          <Box
            sx={{
              display: "flex",

              flexDirection: {
                xs: "column",

                sm: "row",
              },

              justifyContent: "space-between",

              alignItems: {
                xs: "stretch",

                sm: "center",
              },

              gap: 2,

              mb: 2,
            }}
          >
            <Box>
              <Typography variant="h6">
                {isDigitalStaff
                  ? "My Daily Reports"
                  : canReview || canApprove
                    ? "Review Queue"
                    : "Submission Records"}
              </Typography>

              <Typography variant="body2" color="text.secondary">
                {visibleSubmissions.length} submission(s) found.
              </Typography>
            </Box>

            <Button
              size="small"
              startIcon={<RefreshOutlined />}
              onClick={() => void submissionsQuery.refetch()}
              disabled={submissionsQuery.isFetching}
            >
              {submissionsQuery.isFetching ? "Refreshing..." : "Refresh"}
            </Button>
          </Box>

          {submissionsQuery.isLoading ? (
            <Box
              sx={{
                minHeight: 300,

                display: "grid",

                placeItems: "center",
              }}
            >
              <CircularProgress />
            </Box>
          ) : isDigitalStaff ? (
            <SubmissionTable
              data={visibleSubmissions}
              onView={viewSubmission}
              onSubmit={submitReport}
              submittingId={processingId}
            />
          ) : (
            <ManagerSubmissionTable
              data={visibleSubmissions}
              canReview={canReview}
              canApprove={canApprove}
              processingId={processingId}
              onView={viewSubmission}
              onReview={reviewSubmission}
              onApprove={approveSubmission}
              onReturn={openReturnDialog}
            />
          )}
        </CardContent>
      </Card>

      {/* CREATE DRAFT */}

      <CreateSubmissionDialog
        open={createDialogOpen}
        submitting={createMutation.isPending}
        onClose={() => {
          if (createMutation.isPending) {
            return;
          }

          setCreateDialogOpen(false);
        }}
        onSubmit={async (values: CreateSubmissionFormValues) => {
          await createMutation.mutateAsync(values);
        }}
      />

      {/* SUBMISSION DETAILS */}

      <SubmissionDetailsDialog
        open={detailsDialogOpen}
        submission={selectedSubmission}
        onClose={closeDetailsDialog}
        onCorrectActivity={
          isDigitalStaff ? correctSubmissionActivity : undefined
        }
      />

      {/* RETURN FOR CORRECTION */}

      <ReturnSubmissionDialog
        open={returnDialogOpen}
        submitting={returnMutation.isPending}
        onClose={closeReturnDialog}
        onSubmit={async (values: ReturnSubmissionFormValues) => {
          if (!returnSubmission) {
            return;
          }

          await returnMutation.mutateAsync({
            id: returnSubmission.id,

            values,
          });
        }}
      />
    </Box>
  );
}
