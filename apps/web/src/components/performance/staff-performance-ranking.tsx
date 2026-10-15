import {
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

import type {
  PerformanceStatus,
  StaffRankingRow,
} from '../../types/dashboard.types';

interface StaffPerformanceRankingProps {
  data: StaffRankingRow[];
  selectedBranchName?: string;
}

function getStatusLabel(
  status: PerformanceStatus,
) {
  switch (status) {
    case 'ACHIEVED':
      return 'Achieved';

    case 'ON_TRACK':
      return 'On Track';

    case 'NEEDS_ATTENTION':
      return 'Needs Attention';

    case 'NO_TARGET':
      return 'No Target';

    default:
      return 'Critical';
  }
}

function getStatusColor(
  status: PerformanceStatus,
):
  | 'success'
  | 'info'
  | 'warning'
  | 'error'
  | 'default' {
  switch (status) {
    case 'ACHIEVED':
      return 'success';

    case 'ON_TRACK':
      return 'info';

    case 'NEEDS_ATTENTION':
      return 'warning';

    case 'CRITICAL':
      return 'error';

    default:
      return 'default';
  }
}

export function StaffPerformanceRanking({
  data,
  selectedBranchName,
}: StaffPerformanceRankingProps) {
  return (
    <Box
      sx={{
        bgcolor:
          'background.paper',

        border:
          '1px solid',

        borderColor:
          'divider',

        borderRadius: 2,

        overflow:
          'hidden',
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 2,
          borderBottom:
            '1px solid',
          borderColor:
            'divider',
        }}
      >
        <Typography variant="h6">
          Staff Performance Ranking
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 0.5,
          }}
        >
          {selectedBranchName
            ? `Staff performance for ${selectedBranchName}.`
            : 'Compare staff performance within your authorized scope.'}
        </Typography>
      </Box>

      <TableContainer>
        <Table
          size="small"
          sx={{
            minWidth: 1250,
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell>
                Rank
              </TableCell>

              <TableCell>
                Staff
              </TableCell>

              <TableCell>
                Employee No.
              </TableCell>

              <TableCell>
                Branch
              </TableCell>

              <TableCell align="right">
                Target
              </TableCell>

              <TableCell align="right">
                Visits
              </TableCell>

              <TableCell align="right">
                Educated
              </TableCell>

              <TableCell align="right">
                Activations
              </TableCell>

              <TableCell align="right">
                Reactivations
              </TableCell>

              <TableCell align="right">
                Transactions
              </TableCell>

              <TableCell align="right">
                Conversion
              </TableCell>

              <TableCell align="right">
                Achievement
              </TableCell>

              <TableCell align="right">
                Remaining
              </TableCell>

              <TableCell>
                Status
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={14}
                  align="center"
                  sx={{
                    py: 5,
                  }}
                >
                  <Typography
                    color="text.secondary"
                  >
                    No staff
                    performance data
                    found.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              data.map(
                (row) => (
                  <TableRow
                    key={
                      row.staffId
                    }
                    hover
                  >
                    <TableCell>
<Typography
  sx={{
    fontWeight: 700,
  }}
>
  #
  {
    row.rank
  }
</Typography>
                    </TableCell>

                    <TableCell>
<Typography
  sx={{
    fontWeight: 600,
  }}
>
  {
    row.firstName
  }{' '}
  {row.middleName
    ? `${row.middleName} `
    : ''}
  {
    row.lastName
  }
</Typography>
                    </TableCell>

                    <TableCell>
                      {
                        row.employeeNumber
                      }
                    </TableCell>

                    <TableCell>
                      <Typography>
                        {
                          row.branchName
                        }
                      </Typography>

                      <Typography
                        variant="caption"
                        color="text.secondary"
                      >
                        {
                          row.branchCode
                        }
                      </Typography>
                    </TableCell>

                    <TableCell align="right">
                      {
                        row.target
                      }
                    </TableCell>

                    <TableCell align="right">
                      {
                        row.customerVisits
                      }
                    </TableCell>

                    <TableCell align="right">
                      {
                        row.customersEducated
                      }
                    </TableCell>

                    <TableCell align="right">
                      {
                        row.activations
                      }
                    </TableCell>

                    <TableCell align="right">
                      {
                        row.reactivations
                      }
                    </TableCell>

                    <TableCell align="right">
                      {
                        row.transactions
                      }
                    </TableCell>

                    <TableCell align="right">
                      {row.conversionRate.toFixed(
                        1,
                      )}
                      %
                    </TableCell>

                    <TableCell align="right">
                      {row.achievementRate.toFixed(
                        1,
                      )}
                      %
                    </TableCell>

                    <TableCell align="right">
                      {
                        row.remainingTarget
                      }
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        label={getStatusLabel(
                          row.status,
                        )}
                        color={getStatusColor(
                          row.status,
                        )}
                        variant="outlined"
                      />
                    </TableCell>
                  </TableRow>
                ),
              )
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}