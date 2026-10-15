import {
  Box,
  Card,
  CardContent,
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
  BranchPerformanceRow,
} from '../../types/dashboard.types';

interface BranchPerformanceTableProps {
  data: BranchPerformanceRow[];
}

function formatPercent(
  value: number,
) {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return '0%';
  }

  return `${value.toFixed(1)}%`;
}

function achievementColor(
  value: number,
):
  | 'success'
  | 'warning'
  | 'error'
  | 'default' {
  if (value >= 100) {
    return 'success';
  }

  if (value >= 70) {
    return 'warning';
  }

  if (value > 0) {
    return 'error';
  }

  return 'default';
}

export function BranchPerformanceTable({
  data,
}: BranchPerformanceTableProps) {
  return (
    <Card
      elevation={0}
      sx={{
        border:
          '1px solid',

        borderColor:
          'divider',

        borderRadius:
          2,
      }}
    >
      <CardContent
        sx={{
          p: {
            xs: 2,
            md: 2.5,
          },
        }}
      >
        <Typography
          variant="h6"
          sx={{
            mb: 2,
          }}
        >
          Branch Performance
        </Typography>

        {data.length ===
        0 ? (
          <Box
            sx={{
              minHeight:
                180,

              display:
                'grid',

              placeItems:
                'center',
            }}
          >
            <Typography
              color="text.secondary"
            >
              No branch performance
              data available for the
              selected filters.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table
              size="small"
            >
              <TableHead>
                <TableRow>
                  <TableCell>
                    Branch
                  </TableCell>

                  <TableCell>
                    District
                  </TableCell>

                  <TableCell>
                    Region
                  </TableCell>

                  <TableCell
                    align="right"
                  >
                    Target
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

                  <TableCell
                    align="right"
                  >
                    Conversion
                  </TableCell>

                  <TableCell
                    align="right"
                  >
                    Achievement
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {data.map(
                  (row) => (
                    <TableRow
                      key={
                        row.branchId
                      }
                      hover
                    >
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight:
                              600,
                          }}
                        >
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

                      <TableCell>
                        {
                          row.districtName
                        }
                      </TableCell>

                      <TableCell>
                        {
                          row.regionName
                        }
                      </TableCell>

                      <TableCell
                        align="right"
                      >
                        {
                          row.target
                        }
                      </TableCell>

                      <TableCell
                        align="right"
                      >
                        {
                          row.activations
                        }
                      </TableCell>

                      <TableCell
                        align="right"
                      >
                        {
                          row.transactions
                        }
                      </TableCell>

                      <TableCell
                        align="right"
                      >
                        {formatPercent(
                          row.conversionRate,
                        )}
                      </TableCell>

                      <TableCell
                        align="right"
                      >
                        <Chip
                          size="small"
                          label={formatPercent(
                            row.achievementRate,
                          )}
                          color={achievementColor(
                            row.achievementRate,
                          )}
                          variant="outlined"
                        />
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
}