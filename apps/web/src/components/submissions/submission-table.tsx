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

import { SendOutlined, VisibilityOutlined } from "@mui/icons-material";

import type {
  DailySubmission,
  SubmissionStatus,
} from "../../types/submission.types";

interface SubmissionTableProps {
  data: DailySubmission[];

  onView: (submission: DailySubmission) => void;

  onSubmit: (submission: DailySubmission) => void;

  submittingId?: string | null;
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

function statusLabel(status: SubmissionStatus) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function SubmissionTable({
  data,
  onView,
  onSubmit,
  submittingId,
}: SubmissionTableProps) {
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>

            <TableCell>Branch</TableCell>

            <TableCell align="right">Activities</TableCell>

            <TableCell>Status</TableCell>

            <TableCell align="right">Version</TableCell>

            <TableCell>Submitted</TableCell>

            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} align="center">
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
              const canSubmit =
                submission.status === "DRAFT" ||
                submission.status === "RETURNED_FOR_CORRECTION";

              return (
                <TableRow key={submission.id} hover>
                  <TableCell>
                    {new Date(submission.submissionDate).toLocaleDateString()}
                  </TableCell>

                  <TableCell>{submission.branch?.name ?? "-"}</TableCell>

                  <TableCell align="right">
                    {submission.activities?.length ?? 0}
                  </TableCell>

                  <TableCell>
                    <Chip
                      size="small"
                      color={statusColor(submission.status)}
                      label={statusLabel(submission.status)}
                    />
                  </TableCell>

                  <TableCell align="right">{submission.version}</TableCell>

                  <TableCell>
                    {submission.submittedAt
                      ? new Date(submission.submittedAt).toLocaleString()
                      : "-"}
                  </TableCell>

                  <TableCell align="right">
                    <Button
                      size="small"
                      startIcon={<VisibilityOutlined />}
                      onClick={() => onView(submission)}
                    >
                      View
                    </Button>

                    {canSubmit && (
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<SendOutlined />}
                        disabled={submittingId === submission.id}
                        onClick={() => onSubmit(submission)}
                        sx={{
                          ml: 1,
                        }}
                      >
                        {submission.status === "RETURNED_FOR_CORRECTION"
                          ? "Resubmit"
                          : "Submit"}
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
