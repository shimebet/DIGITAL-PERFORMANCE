import {
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

import {
  CheckCircleOutlineOutlined,
  FactCheckOutlined,
  UndoOutlined,
  VisibilityOutlined,
} from "@mui/icons-material";

import type {
  DailySubmission,
  SubmissionStatus,
} from "../../types/submission.types";

interface ManagerSubmissionTableProps {
  data: DailySubmission[];

  canReview: boolean;

  canApprove: boolean;

  processingId?: string | null;

  onView: (submission: DailySubmission) => void;

  onReview: (submission: DailySubmission) => void;

  onApprove: (submission: DailySubmission) => void;

  onReturn: (submission: DailySubmission) => void;
}

function statusColor(
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

function formatStatus(status: SubmissionStatus) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (value) => value.toUpperCase());
}

export function ManagerSubmissionTable({
  data,
  canReview,
  canApprove,
  processingId,
  onView,
  onReview,
  onApprove,
  onReturn,
}: ManagerSubmissionTableProps) {
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>

            <TableCell>Staff</TableCell>

            <TableCell>Branch</TableCell>

            <TableCell>District</TableCell>

            <TableCell align="right">Activities</TableCell>

            <TableCell>Status</TableCell>

            <TableCell align="right">Version</TableCell>

            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} align="center">
                <Typography
                  color="text.secondary"
                  sx={{
                    py: 5,
                  }}
                >
                  No submissions found.
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            data.map((submission) => {
              const canMarkReviewed =
                canReview &&
                (submission.status === "SUBMITTED" ||
                  submission.status === "RESUBMITTED");

              const canReturn =
                canReview &&
                ["SUBMITTED", "RESUBMITTED", "REVIEWED"].includes(
                  submission.status,
                );

              const canMarkApproved =
                canApprove && submission.status === "REVIEWED";

              return (
                <TableRow key={submission.id} hover>
                  <TableCell>
                    {new Date(submission.submissionDate).toLocaleDateString()}
                  </TableCell>

                  <TableCell>
                    {submission.staff
                      ? `${submission.staff.firstName} ${submission.staff.lastName}`
                      : "-"}
                  </TableCell>

                  <TableCell>{submission.branch?.name ?? "-"}</TableCell>

                  <TableCell>
                    {submission.branch?.district?.name ?? "-"}
                  </TableCell>

                  <TableCell align="right">
                    {submission.activities?.length ?? 0}
                  </TableCell>

                  <TableCell>
                    <Chip
                      size="small"
                      color={statusColor(submission.status)}
                      label={formatStatus(submission.status)}
                    />
                  </TableCell>

                  <TableCell align="right">{submission.version}</TableCell>

                  <TableCell align="right">
                    <Button
                      size="small"
                      startIcon={<VisibilityOutlined />}
                      onClick={() => onView(submission)}
                    >
                      View
                    </Button>

                    {canMarkReviewed && (
                      <Button
                        size="small"
                        startIcon={<FactCheckOutlined />}
                        disabled={processingId === submission.id}
                        onClick={() => onReview(submission)}
                      >
                        Review
                      </Button>
                    )}

                    {canReturn && (
                      <Button
                        size="small"
                        color="warning"
                        startIcon={<UndoOutlined />}
                        disabled={processingId === submission.id}
                        onClick={() => onReturn(submission)}
                      >
                        Return
                      </Button>
                    )}

                    {canMarkApproved && (
                      <Button
                        size="small"
                        color="success"
                        variant="contained"
                        startIcon={<CheckCircleOutlineOutlined />}
                        disabled={processingId === submission.id}
                        onClick={() => onApprove(submission)}
                      >
                        Approve
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
