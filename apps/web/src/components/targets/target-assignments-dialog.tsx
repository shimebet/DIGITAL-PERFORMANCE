import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";

import {
  DeleteOutlined,
} from "@mui/icons-material";

import type {
  Target,
  TargetAssignment,
} from "../../types/target.types";

interface TargetAssignmentsDialogProps {
  open: boolean;

  target:
    | Target
    | null;

  assignments:
    TargetAssignment[];

  loading?: boolean;

  deletingId?:
    | string
    | null;

  canDelete?: boolean;

  error?:
    | string
    | null;

  onClose: () => void;

  onDelete: (
    assignment:
      TargetAssignment,
  ) => void;
}

function getAssignmentName(
  assignment:
    TargetAssignment,
) {
  switch (
    assignment.scopeType
  ) {
    case "GLOBAL":
      return "Global";

    case "REGION":
      return (
        assignment.region
          ?.name ??
        "Region"
      );

    case "DISTRICT":
      return (
        assignment.district
          ?.name ??
        "District"
      );

    case "BRANCH":
      return (
        assignment.branch
          ?.name ??
        "Branch"
      );

    case "STAFF":
      if (
        assignment.user
      ) {
        return `${assignment.user.firstName} ${assignment.user.lastName}`;
      }

      return "Staff";

    default:
      return "-";
  }
}

export function TargetAssignmentsDialog({
  open,
  target,
  assignments,
  loading = false,
  deletingId,
  canDelete = false,
  error,
  onClose,
  onDelete,
}: TargetAssignmentsDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
    >
      <DialogTitle>
        Target Assignments
      </DialogTitle>

      <DialogContent>
        {target && (
          <Box
            sx={{
              mb: 2,
            }}
          >
            <Typography
              variant="h6"
            >
              {target.name}
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
            >
              {target.metricType}
              {" · "}
              {target.periodType}
            </Typography>
          </Box>
        )}

        {error && (
          <Alert
            severity="error"
            sx={{
              mb: 2,
            }}
          >
            {error}
          </Alert>
        )}

        {loading ? (
          <Box
            sx={{
              minHeight: 220,

              display: "grid",

              placeItems: "center",
            }}
          >
            <CircularProgress />
          </Box>
        ) : assignments.length ===
          0 ? (
          <Alert severity="info">
            No assignments found for
            this target.
          </Alert>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    Scope
                  </TableCell>

                  <TableCell>
                    Assigned To
                  </TableCell>

                  <TableCell>
                    Product
                  </TableCell>

                  <TableCell
                    align="right"
                  >
                    Target Value
                  </TableCell>

                  {canDelete && (
                    <TableCell
                      align="right"
                    >
                      Actions
                    </TableCell>
                  )}
                </TableRow>
              </TableHead>

              <TableBody>
                {assignments.map(
                  (
                    assignment,
                  ) => (
                    <TableRow
                      key={
                        assignment.id
                      }
                      hover
                    >
                      <TableCell>
                        <Chip
                          size="small"
                          label={
                            assignment.scopeType
                          }
                        />
                      </TableCell>

                      <TableCell>
                        {getAssignmentName(
                          assignment,
                        )}
                      </TableCell>

                      <TableCell>
                        {assignment
                          .product
                          ?.name ??
                          "Overall"}
                      </TableCell>

                      <TableCell
                        align="right"
                      >
                        {Number(
                          assignment.targetValue,
                        ).toLocaleString()}
                      </TableCell>

                      {canDelete && (
                        <TableCell
                          align="right"
                        >
                          <Tooltip title="Remove assignment">
                            <span>
                              <IconButton
                                color="error"
                                disabled={
                                  deletingId ===
                                  assignment.id
                                }
                                onClick={() =>
                                  onDelete(
                                    assignment,
                                  )
                                }
                              >
                                <DeleteOutlined />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                      )}
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
        }}
      >
        <Button
          onClick={onClose}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}