
import { useMemo, useState } from 'react';

import {
  Box,
  Card,
  CardContent,
  Chip,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';

import SearchIcon from '@mui/icons-material/Search';

import type {
  BranchPerformanceRow,
} from '../../types/dashboard.types';

interface BranchPerformanceTableProps {
  data: BranchPerformanceRow[];
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) {
    return '0%';
  }

  return `${value.toFixed(1)}%`;
}

function achievementColor(
  value: number,
): 'success' | 'warning' | 'error' | 'default' {
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
  const [search, setSearch] = useState('');

  const filteredData = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return data;
    }

    return data.filter((row) => {
      const searchableValues = [
        row.branchName,
        row.branchCode,
        row.districtName,
        row.regionName,
      ];

      return searchableValues.some((value) =>
        String(value ?? '')
          .toLowerCase()
          .includes(keyword),
      );
    });
  }, [data, search]);

  return (
    <Card
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
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
        <Box
          sx={{
            display: 'flex',
            alignItems: {
              xs: 'stretch',
              md: 'center',
            },
            justifyContent: 'space-between',
            flexDirection: {
              xs: 'column',
              md: 'row',
            },
            gap: 2,
            mb: 2,
          }}
        >
          <Typography variant="h6">
            Branch Performance
          </Typography>

          <TextField
            size="small"
            label="Search branches"
            placeholder="Branch, code, district or region"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            sx={{
              width: {
                xs: '100%',
                md: 340,
              },
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>

        {data.length === 0 ? (
          <Box
            sx={{
              minHeight: 180,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Typography color="text.secondary">
              No branch performance data available
              for the selected filters.
            </Typography>
          </Box>
        ) : filteredData.length === 0 ? (
          <Box
            sx={{
              minHeight: 180,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Typography color="text.secondary">
              No matching branches found.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Branch</TableCell>
                  <TableCell>District</TableCell>
                  <TableCell>Region</TableCell>
                  <TableCell align="right">
                    Target
                  </TableCell>
                  <TableCell align="right">
                    Activations
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
                </TableRow>
              </TableHead>

              <TableBody>
                {filteredData.map((row) => (
                  <TableRow
                    key={row.branchId}
                    hover
                  >
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600 }}
                      >
                        {row.branchName}
                      </Typography>

                      <Typography
                        variant="caption"
                        color="text.secondary"
                      >
                        {row.branchCode}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      {row.districtName}
                    </TableCell>

                    <TableCell>
                      {row.regionName}
                    </TableCell>

                    <TableCell align="right">
                      {row.target}
                    </TableCell>

                    <TableCell align="right">
                      {row.activations}
                    </TableCell>

                    <TableCell align="right">
                      {row.transactions}
                    </TableCell>

                    <TableCell align="right">
                      {formatPercent(
                        row.conversionRate,
                      )}
                    </TableCell>

                    <TableCell align="right">
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
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
}
