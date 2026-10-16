
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

import {
  HistoryOutlined,
  RefreshOutlined,
} from '@mui/icons-material';

import {
  useQuery,
} from '@tanstack/react-query';

import {
  getReportHistoryApi,
} from '../../api/report-history.api';

import type {
  ReportHistoryEntry,
  ReportHistoryFilters,
  ReportHistoryMetadata,
} from '../../types/report-history.types';

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString();
}

function formatFilters(
  filters?: ReportHistoryFilters,
) {
  if (!filters) {
    return 'All accessible records';
  }

  const parts: string[] = [];

  if (filters.startDate || filters.endDate) {
    parts.push(
      `${filters.startDate ?? 'Any'} to ${filters.endDate ?? 'Any'}`,
    );
  }

  if (filters.regionId) {
    parts.push('Region filtered');
  }

  if (filters.districtId) {
    parts.push('District filtered');
  }

  if (filters.branchId) {
    parts.push('Branch filtered');
  }

  if (filters.staffId) {
    parts.push('Staff filtered');
  }

  if (filters.productId) {
    parts.push('Product filtered');
  }

  return parts.length > 0
    ? parts.join(' | ')
    : 'All accessible records';
}

function getMetadata(
  entry: ReportHistoryEntry,
): ReportHistoryMetadata {
  const value = entry.newValue;

  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return {};
  }

  return value;
}

export function ReportHistoryPanel() {
  const historyQuery = useQuery({
    queryKey: ['reports', 'history'],
    queryFn: getReportHistoryApi,
    staleTime: 30_000,
  });

  const history = historyQuery.data ?? [];

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        borderRadius: 2,
      }}
    >
      <Stack spacing={2}>
<Stack
  direction={{
    xs: 'column',
    sm: 'row',
  }}
  spacing={1.5}
  sx={{
    justifyContent: 'space-between',
    alignItems: {
      xs: 'flex-start',
      sm: 'center',
    },
  }}
>
          <Box>
<Stack
  direction="row"
  spacing={1}
  sx={{
    alignItems: 'center',
  }}
>
              <HistoryOutlined color="primary" />
<Typography
  variant="h6"
  sx={{
    fontWeight: 700,
  }}
>
  Report Generation History
</Typography>
            </Stack>

            <Typography
              variant="body2"
              color="text.secondary"
            >
              Your latest 50 report generation and export records.
            </Typography>
          </Box>

          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshOutlined />}
            disabled={historyQuery.isFetching}
            onClick={() => {
              void historyQuery.refetch();
            }}
          >
            Refresh History
          </Button>
        </Stack>

        {historyQuery.isError && (
          <Alert severity="error">
            Unable to load report generation history.
          </Alert>
        )}

        {historyQuery.isPending ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              py: 4,
            }}
          >
            <CircularProgress size={28} />
          </Box>
        ) : history.length === 0 ? (
          <Alert severity="info">
            No report generation history found yet.
          </Alert>
        ) : (
          <TableContainer>
            <Table
              size="small"
              sx={{
                minWidth: 850,
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell>Generated At</TableCell>
                  <TableCell>Report</TableCell>
                  <TableCell>Format</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Filters</TableCell>
                  <TableCell>Saved Report</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {history.map((entry) => {
                  const metadata =
                    getMetadata(entry);

                  const savedReportId =
                    metadata.savedReportId ??
                    entry.entityId;

                  return (
                    <TableRow
                      key={entry.id}
                      hover
                    >
                      <TableCell>
                        {formatDateTime(
                          entry.createdAt,
                        )}
                      </TableCell>

                      <TableCell>
                        {metadata.reportType ??
                          'PERFORMANCE'}
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={
                            metadata.format ??
                            'UNKNOWN'
                          }
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={entry.action}
                          size="small"
                          color={
                            entry.action ===
                            'EXPORT'
                              ? 'primary'
                              : 'default'
                          }
                        />
                      </TableCell>

                      <TableCell>
                        <Typography
                          variant="body2"
                        >
                          {formatFilters(
                            metadata.filters,
                          )}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        {savedReportId ? (
                          <Typography
                            variant="caption"
                            title={savedReportId}
                            sx={{
                              fontFamily: 'monospace',
                            }}
                          >
                            {savedReportId.slice(0, 8)}...
                          </Typography>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Stack>
    </Paper>
  );
}
