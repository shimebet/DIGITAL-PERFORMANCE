import {
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';

import {
  EditOutlined,
  VisibilityOutlined,
} from '@mui/icons-material';

import type {
  Activity,
} from '../../types/activity.types';

interface ActivityTableProps {
  data: Activity[];

  onView: (
    activity: Activity,
  ) => void;

  onEdit: (
    activity: Activity,
  ) => void;
}

function canEdit(activity: Activity): boolean {
  if (!activity.submissionId) {
    return true;
  }

  if (!activity.submission) {
    return false;
  }

  return [
    "DRAFT",
    "RETURNED_FOR_CORRECTION",
  ].includes(activity.submission.status);
}

export function ActivityTable({
  data,
  onView,
  onEdit,
}: ActivityTableProps) {
  return (
    <TableContainer>
      <Table
        size="small"
      >
        <TableHead>
          <TableRow>
            <TableCell>
              Date
            </TableCell>

            <TableCell>
              Branch
            </TableCell>

            <TableCell
              align="right"
            >
              Visits
            </TableCell>

            <TableCell
              align="right"
            >
              Calls
            </TableCell>

            <TableCell
              align="right"
            >
              Contacted
            </TableCell>

            <TableCell
              align="right"
            >
              Educated
            </TableCell>

            <TableCell
              align="right"
            >
              Activations
            </TableCell>

            <TableCell
              align="right"
            >
              Transactions
            </TableCell>

            <TableCell>
              Status
            </TableCell>

            <TableCell
              align="center"
            >
              Actions
            </TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {data.length ===
          0 ? (
            <TableRow>
              <TableCell
                colSpan={10}
                align="center"
              >
                <Typography
                  color="text.secondary"
                  sx={{
                    py: 4,
                  }}
                >
                  No activities found.
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            data.map(
              (activity) => {
                const editable =
                  canEdit(
                    activity,
                  );

                return (
                  <TableRow
                    key={
                      activity.id
                    }
                    hover
                  >
                    <TableCell>
                      {new Date(
                        activity.activityDate,
                      ).toLocaleDateString()}
                    </TableCell>

                    <TableCell>
                      {activity.branch
                        ?.name ??
                        '-'}
                    </TableCell>

                    <TableCell
                      align="right"
                    >
                      {
                        activity.customerVisits
                      }
                    </TableCell>

                    <TableCell
                      align="right"
                    >
                      {
                        activity.phoneCalls
                      }
                    </TableCell>

                    <TableCell
                      align="right"
                    >
                      {
                        activity.customersContacted
                      }
                    </TableCell>

                    <TableCell
                      align="right"
                    >
                      {
                        activity.customersEducated
                      }
                    </TableCell>

                    <TableCell
                      align="right"
                    >
                      {
                        activity.activations
                      }
                    </TableCell>

                    <TableCell
                      align="right"
                    >
                      {
                        activity.transactions
                      }
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        variant="outlined"
                        label={
                          activity
                            .submission
                            ?.status ??
                          'DRAFT'
                        }
                      />
                    </TableCell>

                    <TableCell
                      align="center"
                    >
                      <Tooltip
                        title="View activity"
                      >
                        <IconButton
                          size="small"
                          onClick={() =>
                            onView(
                              activity,
                            )
                          }
                        >
                          <VisibilityOutlined
                            fontSize="small"
                          />
                        </IconButton>
                      </Tooltip>

                      <Tooltip
                        title={
                          editable
                            ? 'Edit activity'
                            : 'Submitted activities cannot be edited'
                        }
                      >
                        <span>
                          <IconButton
                            size="small"
                            disabled={
                              !editable
                            }
                            onClick={() =>
                              onEdit(
                                activity,
                              )
                            }
                          >
                            <EditOutlined
                              fontSize="small"
                            />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              },
            )
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}