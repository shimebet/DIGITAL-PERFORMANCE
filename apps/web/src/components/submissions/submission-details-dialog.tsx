import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

import { EditOutlined, WarningAmberOutlined } from "@mui/icons-material";

import type {
  DailySubmission,
  SubmissionStatus,
} from "../../types/submission.types";

interface SubmissionDetailsDialogProps {
  open: boolean;

  submission: DailySubmission | null;

  onClose: () => void;

  onCorrectActivity?: (submission: DailySubmission) => void;
}

function getStatusColor(
  status: SubmissionStatus,
): "default" | "primary" | "success" | "warning" | "error" | "info" {
  switch (status) {
    case "DRAFT":
      return "default";

    case "SUBMITTED":
      return "info";

    case "RESUBMITTED":
      return "primary";

    case "REVIEWED":
      return "warning";

    case "APPROVED":
      return "success";

    case "RETURNED_FOR_CORRECTION":
      return "error";

    default:
      return "default";
  }
}

function getStatusLabel(status: SubmissionStatus) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function SubmissionDetailsDialog({
  open,
  submission,
  onClose,
  onCorrectActivity,
}: SubmissionDetailsDialogProps) {
  if (!submission) {
    return null;
  }

  const requiresCorrection = submission.status === "RETURNED_FOR_CORRECTION";

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>Submission Details</DialogTitle>

      <DialogContent dividers>
        <Box
          sx={{
            display: "grid",

            gap: 3,
          }}
        >
          {/* SUMMARY */}

          <Box
            sx={{
              display: "grid",

              gridTemplateColumns: {
                xs: "1fr",

                sm: "repeat(2, minmax(0, 1fr))",

                md: "repeat(4, minmax(0, 1fr))",
              },

              gap: 2,
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary">
                Staff
              </Typography>

              <Typography
                sx={{
                  fontWeight: 600,
                }}
              >
                {submission.staff
                  ? `${submission.staff.firstName} ${submission.staff.lastName}`
                  : "-"}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                Branch
              </Typography>

              <Typography
                sx={{
                  fontWeight: 600,
                }}
              >
                {submission.branch?.name ?? "-"}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                Submission Date
              </Typography>

              <Typography
                sx={{
                  fontWeight: 600,
                }}
              >
                {new Date(submission.submissionDate).toLocaleDateString()}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                Status
              </Typography>

              <Box
                sx={{
                  mt: 0.5,
                }}
              >
                <Chip
                  size="small"
                  color={getStatusColor(submission.status)}
                  label={getStatusLabel(submission.status)}
                />
              </Box>
            </Box>
          </Box>

          {/* CORRECTION REQUIRED */}

          {requiresCorrection && (
            <Alert severity="warning" icon={<WarningAmberOutlined />}>
              <Box>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 700,

                    mb: 0.5,
                  }}
                >
                  Correction Required
                </Typography>

                <Typography
                  variant="body2"
                  sx={{
                    mb: onCorrectActivity ? 2 : 0,
                  }}
                >
                  {submission.returnReason?.trim()
                    ? submission.returnReason
                    : "This submission was returned for correction."}
                </Typography>

                {onCorrectActivity && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<EditOutlined />}
                    onClick={() => onCorrectActivity(submission)}
                  >
                    Correct Activity
                  </Button>
                )}
              </Box>
            </Alert>
          )}

          {/* SUBMISSION REMARKS */}

          {submission.remarks && (
            <Paper
              variant="outlined"
              sx={{
                p: 2,
              }}
            >
              <Typography variant="subtitle2" color="text.secondary">
                Submission Remarks
              </Typography>

              <Typography
                sx={{
                  mt: 0.5,
                }}
              >
                {submission.remarks}
              </Typography>
            </Paper>
          )}

          <Divider />

          {/* ACTIVITIES */}

          <Box>
            <Typography
              variant="h6"
              sx={{
                mb: 2,
              }}
            >
              Activities
            </Typography>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>

                    <TableCell align="right">Visits</TableCell>

                    <TableCell align="right">Calls</TableCell>

                    <TableCell align="right">Contacted</TableCell>

                    <TableCell align="right">Educated</TableCell>

                    <TableCell align="right">Activations</TableCell>

                    <TableCell align="right">Reactivations</TableCell>

                    <TableCell align="right">Transactions</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {submission.activities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        No activities.
                      </TableCell>
                    </TableRow>
                  ) : (
                    submission.activities.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell>
                          {new Date(activity.activityDate).toLocaleDateString()}
                        </TableCell>

                        <TableCell align="right">
                          {activity.customerVisits}
                        </TableCell>

                        <TableCell align="right">
                          {activity.phoneCalls}
                        </TableCell>

                        <TableCell align="right">
                          {activity.customersContacted}
                        </TableCell>

                        <TableCell align="right">
                          {activity.customersEducated}
                        </TableCell>

                        <TableCell align="right">
                          {activity.activations}
                        </TableCell>

                        <TableCell align="right">
                          {activity.reactivations}
                        </TableCell>

                        <TableCell align="right">
                          {activity.transactions}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          <Divider />

          {/* PRODUCT PERFORMANCE */}

          <Box>
            <Typography
              variant="h6"
              sx={{
                mb: 2,
              }}
            >
              Product Performance
            </Typography>

            {submission.activities.length === 0 ? (
              <Typography color="text.secondary">
                No product performance records.
              </Typography>
            ) : (
              submission.activities.map((activity) => (
                <Box
                  key={activity.id}
                  sx={{
                    mb: 3,
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{
                      mb: 1,
                    }}
                  >
                    {new Date(activity.activityDate).toLocaleDateString()}
                  </Typography>

                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Product</TableCell>

                          <TableCell align="right">Engaged</TableCell>

                          <TableCell align="right">Activations</TableCell>

                          <TableCell align="right">Reactivations</TableCell>

                          <TableCell align="right">Transactions</TableCell>

                          <TableCell align="right">Failed</TableCell>
                        </TableRow>
                      </TableHead>

                      <TableBody>
                        {!activity.products ||
                        activity.products.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} align="center">
                              No product records.
                            </TableCell>
                          </TableRow>
                        ) : (
                          activity.products.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>{item.product?.name ?? "-"}</TableCell>

                              <TableCell align="right">
                                {item.customersEngaged}
                              </TableCell>

                              <TableCell align="right">
                                {item.activations}
                              </TableCell>

                              <TableCell align="right">
                                {item.reactivations}
                              </TableCell>

                              <TableCell align="right">
                                {item.transactions}
                              </TableCell>

                              <TableCell align="right">
                                {item.failedActivations}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              ))
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,

          py: 2,
        }}
      >
        <Button onClick={onClose}>Close</Button>

        {requiresCorrection && onCorrectActivity && (
          <Button
            variant="contained"
            startIcon={<EditOutlined />}
            onClick={() => onCorrectActivity(submission)}
          >
            Correct Activity
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
