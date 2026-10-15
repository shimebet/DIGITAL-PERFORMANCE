import { useMemo, useState } from "react";

import axios from "axios";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  TextField,
  Typography,
} from "@mui/material";

import {
  AddOutlined,
  ArrowBackOutlined,
  EditOutlined,
  RefreshOutlined,
} from "@mui/icons-material";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useLocation, useNavigate } from "react-router-dom";

import {
  createActivityApi,
  getMyActivitiesApi,
  updateActivityApi,
} from "../api/activities.api";

import { ActivityFormDialog } from "../components/activities/activity-form-dialog";

import { ActivityTable } from "../components/activities/activity-table";

import { useAuthStore } from "../stores/auth.store";

import type {
  Activity,
  CreateActivityRequest,
  UpdateActivityRequest,
} from "../types/activity.types";

import type { ActivityFormValues } from "../validation/activity.schema";

// ============================================================================
// TYPES
// ============================================================================

type DialogMode = "create" | "view" | "edit";

interface CorrectionRouteState {
  correctionSubmissionId?: string;

  correctionDate?: string;

  returnReason?: string | null;
}

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

    return error.message || "The server rejected the request.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
}

// ============================================================================
// PAGE
// ============================================================================

export function ActivitiesPage() {
  const queryClient = useQueryClient();

  const location = useLocation();

  const navigate = useNavigate();

  // ==========================================================================
  // AUTH
  // ==========================================================================

  const user = useAuthStore((state) => state.user);

  const hasPermission = useAuthStore((state) => state.hasPermission);

  const isDigitalStaff =
    user?.roles?.includes("DIGITAL_RESKILLED_STAFF") ?? false;

  const canCreate = hasPermission("activity.create") && isDigitalStaff;

  const canUpdate = hasPermission("activity.update") && isDigitalStaff;

  // ==========================================================================
  // CORRECTION ROUTE STATE
  // ==========================================================================

  const routeState = location.state as CorrectionRouteState | null;

  const correctionSubmissionId = routeState?.correctionSubmissionId;

  const correctionDate = routeState?.correctionDate;

  const returnReason = routeState?.returnReason;

  const isCorrectionMode = Boolean(correctionSubmissionId && correctionDate);

  // ==========================================================================
  // FILTER STATE
  // ==========================================================================

  const [startDate, setStartDate] = useState(correctionDate ?? monthStart());

  const [endDate, setEndDate] = useState(correctionDate ?? today());

  // ==========================================================================
  // DIALOG STATE
  // ==========================================================================

  const [dialogOpen, setDialogOpen] = useState(false);

  const [dialogMode, setDialogMode] = useState<DialogMode>("create");

  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null,
  );

  // ==========================================================================
  // FEEDBACK
  // ==========================================================================

  const [actionError, setActionError] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ==========================================================================
  // LOAD CURRENT USER'S ACTIVITIES
  //
  // Backend:
  // GET /api/activities/mine
  // ==========================================================================

  const activitiesQuery = useQuery({
    queryKey: ["activities", "mine"],

    queryFn: getMyActivitiesApi,
  });

  // ==========================================================================
  // FILTER ACTIVITIES
  // ==========================================================================

  const filteredActivities = useMemo(() => {
    const rows = activitiesQuery.data ?? [];

    /*
     * Correction mode takes priority.
     *
     * Only show activities belonging to
     * the returned submission date.
     */
    if (isCorrectionMode && correctionDate) {
      return rows.filter(
        (activity) => activity.activityDate.slice(0, 10) === correctionDate,
      );
    }

    /*
     * Normal activities page.
     */
    return rows.filter((activity) => {
      const activityDate = activity.activityDate.slice(0, 10);

      if (startDate && activityDate < startDate) {
        return false;
      }

      if (endDate && activityDate > endDate) {
        return false;
      }

      return true;
    });
  }, [
    activitiesQuery.data,
    isCorrectionMode,
    correctionDate,
    startDate,
    endDate,
  ]);

  // ==========================================================================
  // ACTIVITY REQUIRING CORRECTION
  // ==========================================================================

  const correctionActivity = useMemo(() => {
    if (!isCorrectionMode) {
      return null;
    }

    return filteredActivities[0] ?? null;
  }, [isCorrectionMode, filteredActivities]);

  // ==========================================================================
  // CREATE / UPDATE
  // ==========================================================================

  const saveMutation = useMutation({
    mutationFn: async (values: ActivityFormValues) => {
      /*
       * Product totals are already validated
       * by Zod before reaching this point.
       */

      if (dialogMode === "edit" && selectedActivity) {
        /*
         * UpdateActivityDto does not contain
         * activityDate.
         *
         * Therefore activityDate is intentionally
         * excluded from update requests.
         */

        const payload: UpdateActivityRequest = {
          customerVisits: values.customerVisits,

          phoneCalls: values.phoneCalls,

          customersContacted: values.customersContacted,

          customersEducated: values.customersEducated,

          activations: values.activations,

          reactivations: values.reactivations,

          transactions: values.transactions,

          remarks: values.remarks?.trim() || undefined,

          challenges: values.challenges?.trim() || undefined,

          products: values.products.map((product) => ({
            productId: product.productId,

            customersEngaged: product.customersEngaged,

            activations: product.activations,

            reactivations: product.reactivations,

            transactions: product.transactions,

            failedActivations: product.failedActivations,

            remarks: product.remarks?.trim() || undefined,
          })),
        };

        return updateActivityApi(selectedActivity.id, payload);
      }

      /*
       * Create activity.
       */

      const payload: CreateActivityRequest = {
        activityDate: values.activityDate,

        customerVisits: values.customerVisits,

        phoneCalls: values.phoneCalls,

        customersContacted: values.customersContacted,

        customersEducated: values.customersEducated,

        activations: values.activations,

        reactivations: values.reactivations,

        transactions: values.transactions,

        remarks: values.remarks?.trim() || undefined,

        challenges: values.challenges?.trim() || undefined,

        products: values.products.map((product) => ({
          productId: product.productId,

          customersEngaged: product.customersEngaged,

          activations: product.activations,

          reactivations: product.reactivations,

          transactions: product.transactions,

          failedActivations: product.failedActivations,

          remarks: product.remarks?.trim() || undefined,
        })),
      };

      return createActivityApi(payload);
    },

    onMutate: () => {
      setActionError(null);

      setSuccessMessage(null);
    },

    onSuccess: async () => {
      setDialogOpen(false);

      setSelectedActivity(null);

      setDialogMode("create");

      /*
       * Refresh activity list.
       */

      await queryClient.invalidateQueries({
        queryKey: ["activities", "mine"],
      });

      /*
       * Refresh submission data because
       * activity corrections affect the
       * returned submission.
       */

      await queryClient.invalidateQueries({
        queryKey: ["submissions"],
      });

      /*
       * Refresh dashboard metrics.
       */

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["dashboard-overview"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["dashboard-trend"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["dashboard-products"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["dashboard-branches"],
        }),
      ]);

      if (isCorrectionMode) {
        setSuccessMessage(
          "Activity correction saved successfully. Review the corrected figures, then return to Submissions and resubmit the report.",
        );

        return;
      }

      setSuccessMessage("Activity saved successfully.");
    },

    onError: (error) => {
      setActionError(getErrorMessage(error));
    },
  });

  // ==========================================================================
  // DIALOG ACTIONS
  // ==========================================================================

  function openCreate() {
    setActionError(null);

    setSuccessMessage(null);

    setSelectedActivity(null);

    setDialogMode("create");

    setDialogOpen(true);
  }

  function openView(activity: Activity) {
    setActionError(null);

    setSelectedActivity(activity);

    setDialogMode("view");

    setDialogOpen(true);
  }

function openEdit(activity: Activity) {
  setActionError(null);

  const submissionStatus =
    activity.submission?.status;

  const isEditable =
    !activity.submissionId ||
    (
      !!activity.submission &&
      [
        "DRAFT",
        "RETURNED_FOR_CORRECTION",
      ].includes(submissionStatus ?? "")
    );

  if (!canUpdate || !isEditable) {
    openView(activity);
    return;
  }

  setSelectedActivity(activity);
  setDialogMode("edit");
  setDialogOpen(true);
}

  function closeDialog() {
    if (saveMutation.isPending) {
      return;
    }

    setDialogOpen(false);

    setSelectedActivity(null);

    setDialogMode("create");

    setActionError(null);
  }

  // ==========================================================================
  // CORRECTION NAVIGATION
  // ==========================================================================

  function exitCorrectionMode() {
    navigate("/activities", {
      replace: true,
    });
  }

  function backToSubmissions() {
    navigate("/submissions");
  }

  // ==========================================================================
  // RESET FILTER
  // ==========================================================================

  function resetFilters() {
    if (isCorrectionMode && correctionDate) {
      setStartDate(correctionDate);

      setEndDate(correctionDate);

      return;
    }

    setStartDate(monthStart());

    setEndDate(today());
  }

  // ==========================================================================
  // PAGE
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
      {/* =====================================================================
          HEADER
      ===================================================================== */}

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
          <Typography variant="h4">Activities</Typography>

          <Typography
            color="text.secondary"
            sx={{
              mt: 0.5,
            }}
          >
            {isCorrectionMode
              ? "Review and correct the activity returned by your reviewer."
              : "Capture and manage your daily digital performance activities."}
          </Typography>
        </Box>

        {!isCorrectionMode && canCreate && (
          <Button
            variant="contained"
            startIcon={<AddOutlined />}
            onClick={openCreate}
          >
            Add Activity
          </Button>
        )}
      </Box>

      {/* =====================================================================
          CORRECTION REQUIRED
      ===================================================================== */}

      {isCorrectionMode && (
        <Alert
          severity="warning"
          sx={{
            mb: 3,
          }}
          action={
            <Button color="inherit" size="small" onClick={exitCorrectionMode}>
              Exit Correction
            </Button>
          }
        >
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,

              mb: 0.5,
            }}
          >
            Correction Required
          </Typography>

          <Typography variant="body2">
            Your submission for{" "}
            <strong>
              {correctionDate
                ? new Date(`${correctionDate}T00:00:00`).toLocaleDateString()
                : "-"}
            </strong>{" "}
            was returned by the reviewer.
          </Typography>

          <Typography
            variant="body2"
            sx={{
              mt: 1,
            }}
          >
            <strong>Reviewer Reason:</strong>{" "}
            {returnReason?.trim()
              ? returnReason
              : "Please review and correct the activity information."}
          </Typography>

          <Typography
            variant="body2"
            sx={{
              mt: 1,
            }}
          >
            Edit the activity below, save the corrected figures, then return to
            Submissions and resubmit the report.
          </Typography>
        </Alert>
      )}

      {/* =====================================================================
          SUCCESS
      ===================================================================== */}

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

      {/* =====================================================================
          CURRENT USER / SCOPE
      ===================================================================== */}

      <Card
        elevation={0}
        sx={{
          mb: 3,

          border: "1px solid",

          borderColor: "divider",
        }}
      >
        <CardContent>
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

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 0.5,
            }}
          >
            {isCorrectionMode
              ? "Only activities for the returned submission date are shown below."
              : "Activities shown here belong to the currently authenticated user."}
          </Typography>
        </CardContent>
      </Card>

      {/* =====================================================================
          CORRECTION ACTIVITY
      ===================================================================== */}

      {isCorrectionMode && correctionActivity && (
        <Card
          elevation={0}
          sx={{
            mb: 3,

            border: "1px solid",

            borderColor: "warning.main",
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
              }}
            >
              <Box>
                <Typography variant="h6">
                  Activity Requiring Correction
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mt: 0.5,
                  }}
                >
                  Activity Date:{" "}
                  {new Date(
                    correctionActivity.activityDate,
                  ).toLocaleDateString()}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  Activations: {correctionActivity.activations} · Reactivations:{" "}
                  {correctionActivity.reactivations} · Transactions:{" "}
                  {correctionActivity.transactions}
                </Typography>
              </Box>

              <Button
                variant="contained"
                startIcon={<EditOutlined />}
                onClick={() => openEdit(correctionActivity)}
                disabled={!canUpdate}
              >
                Edit Activity
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {isCorrectionMode &&
        !activitiesQuery.isLoading &&
        !correctionActivity && (
          <Alert
            severity="error"
            sx={{
              mb: 3,
            }}
          >
            No activity was found for the returned submission date. Do not
            resubmit until this is investigated.
          </Alert>
        )}

      {/* =====================================================================
          DATE FILTER
      ===================================================================== */}

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

                sm: "repeat(2, minmax(0, 1fr)) auto",
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
              disabled={isCorrectionMode}
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
              disabled={isCorrectionMode}
              onChange={(event) => setEndDate(event.target.value)}
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
            />

            <Button
              variant="outlined"
              startIcon={<RefreshOutlined />}
              onClick={() => {
                resetFilters();

                void activitiesQuery.refetch();
              }}
            >
              Reset
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* =====================================================================
          ERRORS
      ===================================================================== */}

      {activitiesQuery.isError && (
        <Alert
          severity="error"
          sx={{
            mb: 3,
          }}
        >
          {getErrorMessage(activitiesQuery.error)}
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

      {/* =====================================================================
          ACTIVITY LIST
      ===================================================================== */}

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
                {isCorrectionMode
                  ? "Activity to Correct"
                  : "My Daily Activities"}
              </Typography>

              <Typography variant="body2" color="text.secondary">
                {filteredActivities.length} activity record(s)
                {isCorrectionMode
                  ? " for the returned submission."
                  : " in the selected period."}
              </Typography>
            </Box>

            <Box
              sx={{
                display: "flex",

                gap: 1,

                flexWrap: "wrap",
              }}
            >
              {isCorrectionMode && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ArrowBackOutlined />}
                  onClick={backToSubmissions}
                >
                  Back to Submissions
                </Button>
              )}

              <Button
                size="small"
                variant="text"
                startIcon={<RefreshOutlined />}
                onClick={() => void activitiesQuery.refetch()}
                disabled={activitiesQuery.isFetching}
              >
                Refresh
              </Button>
            </Box>
          </Box>

          {activitiesQuery.isLoading ? (
            <Box
              sx={{
                minHeight: 260,

                display: "grid",

                placeItems: "center",
              }}
            >
              <CircularProgress />
            </Box>
          ) : (
            <ActivityTable
              data={filteredActivities}
              onView={openView}
              onEdit={canUpdate ? openEdit : openView}
            />
          )}
        </CardContent>
      </Card>

      {/* =====================================================================
          CREATE / VIEW / EDIT DIALOG
      ===================================================================== */}

      <ActivityFormDialog
        open={dialogOpen}
        mode={dialogMode}
        activity={selectedActivity}
        onClose={closeDialog}
        onSubmit={async (values) => {
          await saveMutation.mutateAsync(values);
        }}
        submitting={saveMutation.isPending}
      />
    </Box>
  );
}
