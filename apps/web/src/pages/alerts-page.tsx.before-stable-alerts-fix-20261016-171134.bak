// src/pages/alerts-page.tsx

import {
  useMemo,
  useState,
} from 'react';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';

import {
  CheckCircleOutlined,
  DoneAllOutlined,
  NotificationsActiveOutlined,
  RefreshOutlined,
  VisibilityOutlined,
  WarningAmberOutlined,
} from '@mui/icons-material';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  acknowledgeAlertApi,
  getAlertsApi,
  resolveAlertApi,
} from '../api/alerts.api';

import {
  OrganizationFilter,
} from '../components/filters/organization-filter';

import {
  useAuthStore,
} from '../stores/auth.store';

import {
  useFilterStore,
} from '../stores/filter.store';

import type {
  AlertQuery,
  AlertRecord,
  AlertSeverity,
  AlertStatus,
} from '../types/alert.types';

// ============================================================================
// HELPERS
// ============================================================================

function formatDateTime(
  value: string | null | undefined,
) {
  if (!value) {
    return '-';
  }

  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return '-';
  }

  return date.toLocaleString();
}

function formatAlertType(
  value: string,
) {
  return value
    .toLowerCase()
    .split('_')
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1),
    )
    .join(' ');
}

function recipientName(
  alert: AlertRecord,
) {
  if (!alert.recipient) {
    return '-';
  }

  return [
    alert.recipient.firstName,
    alert.recipient.middleName,
    alert.recipient.lastName,
  ]
    .filter(Boolean)
    .join(' ');
}

function getSeverityColor(
  severity: AlertSeverity,
):
  | 'default'
  | 'info'
  | 'success'
  | 'warning'
  | 'error' {
  switch (severity) {
    case 'INFO':
      return 'info';

    case 'LOW':
      return 'success';

    case 'MEDIUM':
      return 'warning';

    case 'HIGH':
    case 'CRITICAL':
      return 'error';

    default:
      return 'default';
  }
}

function getStatusColor(
  status: AlertStatus,
):
  | 'default'
  | 'info'
  | 'success'
  | 'warning'
  | 'error' {
  switch (status) {
    case 'OPEN':
      return 'error';

    case 'ACKNOWLEDGED':
      return 'warning';

    case 'RESOLVED':
      return 'success';

    case 'DISMISSED':
      return 'default';

    default:
      return 'default';
  }
}

// ============================================================================
// SUMMARY CARD
// ============================================================================

interface SummaryCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
}

function SummaryCard({
  title,
  value,
  icon,
}: SummaryCardProps) {
  return (
    <Card
      variant="outlined"
      sx={{
        height:
          '100%',
      }}
    >
      <CardContent>
        <Stack
          direction="row"
          spacing={2}
          sx={{
            alignItems:
              'center',

            justifyContent:
              'space-between',
          }}
        >
          <Box>
            <Typography
              variant="body2"
              color="text.secondary"
            >
              {title}
            </Typography>

            <Typography
              variant="h4"
              sx={{
                mt: 0.5,
                fontWeight:
                  700,
              }}
            >
              {value}
            </Typography>
          </Box>

          <Box
            sx={{
              display:
                'flex',

              alignItems:
                'center',

              justifyContent:
                'center',
            }}
          >
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// PAGE
// ============================================================================

export function AlertsPage() {
  const queryClient =
    useQueryClient();

  // ==========================================================================
  // AUTH
  // ==========================================================================

  const user =
    useAuthStore(
      (state) =>
        state.user,
    );

  /*
   * Frontend authorization is for user experience only.
   * Backend @Permissions('alert.update') remains authoritative.
   */
  const canUpdateAlerts =
    user?.roles.some(
      (role) =>
        role ===
          'SUPER_ADMIN' ||
        role ===
          'SYSTEM_ADMIN' ||
        role ===
          'REGIONAL_MANAGER' ||
        role ===
          'DISTRICT_MANAGER' ||
        role ===
          'BRANCH_MANAGER',
    ) ?? false;

  // ==========================================================================
  // SHARED FILTERS
  // ==========================================================================

  const regionId =
    useFilterStore(
      (state) =>
        state.regionId,
    );

  const districtId =
    useFilterStore(
      (state) =>
        state.districtId,
    );

  const branchId =
    useFilterStore(
      (state) =>
        state.branchId,
    );

  const productId =
    useFilterStore(
      (state) =>
        state.productId,
    );

  const startDate =
    useFilterStore(
      (state) =>
        state.startDate,
    );

  const endDate =
    useFilterStore(
      (state) =>
        state.endDate,
    );

  // ==========================================================================
  // ALERT-SPECIFIC FILTERS
  // ==========================================================================

  const [
    status,
    setStatus,
  ] =
    useState<
      AlertStatus | ''
    >('');

  const [
    severity,
    setSeverity,
  ] =
    useState<
      AlertSeverity | ''
    >('');

  const [
    selectedAlert,
    setSelectedAlert,
  ] =
    useState<
      AlertRecord | null
    >(null);

  // ==========================================================================
  // API QUERY
  // ==========================================================================

  const alertQuery =
    useMemo<AlertQuery>(
      () => ({
        ...(regionId
          ? {
              regionId,
            }
          : {}),

        ...(districtId
          ? {
              districtId,
            }
          : {}),

        ...(branchId
          ? {
              branchId,
            }
          : {}),

        ...(productId
          ? {
              productId,
            }
          : {}),

        ...(startDate
          ? {
              startDate,
            }
          : {}),

        ...(endDate
          ? {
              endDate,
            }
          : {}),

        ...(status
          ? {
              status,
            }
          : {}),

        ...(severity
          ? {
              severity,
            }
          : {}),
      }),
      [
        regionId,
        districtId,
        branchId,
        productId,
        startDate,
        endDate,
        status,
        severity,
      ],
    );

  const alertsQuery =
    useQuery({
      queryKey: [
        'alerts',
        user?.id,
        alertQuery,
      ],

      queryFn: () =>
        getAlertsApi(
          alertQuery,
        ),

      enabled:
        Boolean(
          user,
        ),
    });

  const alerts =
    alertsQuery.data ??
    [];

  // ==========================================================================
  // SUMMARY
  // ==========================================================================

  const summary =
    useMemo(
      () => {
        let open =
          0;

        let acknowledged =
          0;

        let resolved =
          0;

        let criticalHigh =
          0;

        for (
          const alert
          of alerts
        ) {
          if (
            alert.status ===
            'OPEN'
          ) {
            open +=
              1;
          }

          if (
            alert.status ===
            'ACKNOWLEDGED'
          ) {
            acknowledged +=
              1;
          }

          if (
            alert.status ===
            'RESOLVED'
          ) {
            resolved +=
              1;
          }

          if (
            alert.severity ===
              'HIGH' ||
            alert.severity ===
              'CRITICAL'
          ) {
            criticalHigh +=
              1;
          }
        }

        return {
          total:
            alerts.length,

          open,

          acknowledged,

          resolved,

          criticalHigh,
        };
      },
      [
        alerts,
      ],
    );

  // ==========================================================================
  // MUTATIONS
  // ==========================================================================

  const acknowledgeMutation =
    useMutation({
      mutationFn:
        acknowledgeAlertApi,

      onSuccess:
        async (
          updatedAlert,
        ) => {
          if (
            selectedAlert?.id ===
            updatedAlert.id
          ) {
            setSelectedAlert(
              updatedAlert,
            );
          }

          await queryClient.invalidateQueries({
            queryKey: [
              'alerts',
            ],
          });
        },
    });

  const resolveMutation =
    useMutation({
      mutationFn:
        resolveAlertApi,

      onSuccess:
        async (
          updatedAlert,
        ) => {
          if (
            selectedAlert?.id ===
            updatedAlert.id
          ) {
            setSelectedAlert(
              updatedAlert,
            );
          }

          await queryClient.invalidateQueries({
            queryKey: [
              'alerts',
            ],
          });
        },
    });

  const mutationError =
    acknowledgeMutation.error ??
    resolveMutation.error;

  const isUpdating =
    acknowledgeMutation.isPending ||
    resolveMutation.isPending;

  // ==========================================================================
  // ACTIONS
  // ==========================================================================

  const handleAcknowledge = (
    id: string,
  ) => {
    acknowledgeMutation.mutate(
      id,
    );
  };

  const handleResolve = (
    id: string,
  ) => {
    resolveMutation.mutate(
      id,
    );
  };

  const handleViewAlert = (
    alert: AlertRecord,
  ) => {
    setSelectedAlert(
      alert,
    );
  };

  const handleCloseAlert =
    () => {
      if (
        isUpdating
      ) {
        return;
      }

      setSelectedAlert(
        null,
      );
    };

  const handleResetAlertFilters =
    () => {
      setStatus('');
      setSeverity('');
    };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <Stack
      spacing={3}
    >
      {/* =====================================================================
          HEADER
      ===================================================================== */}

      <Stack
        direction={{
          xs:
            'column',

          sm:
            'row',
        }}
        spacing={2}
        sx={{
          justifyContent:
            'space-between',

          alignItems: {
            xs:
              'stretch',

            sm:
              'center',
          },
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight:
                700,
            }}
          >
            Alerts
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt:
                0.5,
            }}
          >
            Monitor missed submissions,
            overdue follow-ups,
            performance exceptions,
            and operational alerts.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={
            <RefreshOutlined />
          }
          onClick={() =>
            alertsQuery.refetch()
          }
          disabled={
            alertsQuery.isFetching
          }
        >
          {alertsQuery.isFetching
            ? 'Refreshing...'
            : 'Refresh'}
        </Button>
      </Stack>

      {/* =====================================================================
          ORGANIZATION / PRODUCT / DATE FILTERS
      ===================================================================== */}

      <Paper
        variant="outlined"
        sx={{
          p:
            2,
        }}
      >
        <OrganizationFilter />
      </Paper>

      {/* =====================================================================
          ALERT FILTERS
      ===================================================================== */}

      <Paper
        variant="outlined"
        sx={{
          p:
            2,
        }}
      >
        <Stack
          direction={{
            xs:
              'column',

            sm:
              'row',
          }}
          spacing={2}
          sx={{
            alignItems: {
              xs:
                'stretch',

              sm:
                'center',
            },
          }}
        >
          <TextField
            select
            size="small"
            label="Status"
            value={
              status
            }
            onChange={(
              event,
            ) =>
              setStatus(
                event.target
                  .value as
                  | AlertStatus
                  | '',
              )
            }
            sx={{
              minWidth:
                190,
            }}
          >
            <MenuItem
              value=""
            >
              All Statuses
            </MenuItem>

            <MenuItem
              value="OPEN"
            >
              Open
            </MenuItem>

            <MenuItem
              value="ACKNOWLEDGED"
            >
              Acknowledged
            </MenuItem>

            <MenuItem
              value="RESOLVED"
            >
              Resolved
            </MenuItem>

            <MenuItem
              value="DISMISSED"
            >
              Dismissed
            </MenuItem>
          </TextField>

          <TextField
            select
            size="small"
            label="Severity"
            value={
              severity
            }
            onChange={(
              event,
            ) =>
              setSeverity(
                event.target
                  .value as
                  | AlertSeverity
                  | '',
              )
            }
            sx={{
              minWidth:
                190,
            }}
          >
            <MenuItem
              value=""
            >
              All Severities
            </MenuItem>

            <MenuItem
              value="INFO"
            >
              Info
            </MenuItem>

            <MenuItem
              value="LOW"
            >
              Low
            </MenuItem>

            <MenuItem
              value="MEDIUM"
            >
              Medium
            </MenuItem>

            <MenuItem
              value="HIGH"
            >
              High
            </MenuItem>

            <MenuItem
              value="CRITICAL"
            >
              Critical
            </MenuItem>
          </TextField>

          <Button
            variant="text"
            onClick={
              handleResetAlertFilters
            }
          >
            Reset Alert Filters
          </Button>
        </Stack>
      </Paper>

      {/* =====================================================================
          ERRORS
      ===================================================================== */}

      {alertsQuery.isError && (
        <Alert
          severity="error"
        >
          Unable to load alerts.
          Please try again.
        </Alert>
      )}

      {mutationError && (
        <Alert
          severity="error"
        >
          Unable to update the alert.
          Please try again.
        </Alert>
      )}

      {/* =====================================================================
          SUMMARY
      ===================================================================== */}

      <Box
        sx={{
          display:
            'grid',

          gridTemplateColumns: {
            xs:
              '1fr',

            sm:
              'repeat(2, minmax(0, 1fr))',

            lg:
              'repeat(5, minmax(0, 1fr))',
          },

          gap:
            2,
        }}
      >
        <SummaryCard
          title="Total Alerts"
          value={
            summary.total
          }
          icon={
            <NotificationsActiveOutlined
              fontSize="large"
            />
          }
        />

        <SummaryCard
          title="Open"
          value={
            summary.open
          }
          icon={
            <WarningAmberOutlined
              fontSize="large"
            />
          }
        />

        <SummaryCard
          title="Acknowledged"
          value={
            summary.acknowledged
          }
          icon={
            <DoneAllOutlined
              fontSize="large"
            />
          }
        />

        <SummaryCard
          title="Resolved"
          value={
            summary.resolved
          }
          icon={
            <CheckCircleOutlined
              fontSize="large"
            />
          }
        />

        <SummaryCard
          title="High / Critical"
          value={
            summary.criticalHigh
          }
          icon={
            <WarningAmberOutlined
              fontSize="large"
            />
          }
        />
      </Box>

      {/* =====================================================================
          ALERT REGISTER
      ===================================================================== */}

      <Paper
        variant="outlined"
        sx={{
          overflow:
            'hidden',
        }}
      >
        <Box
          sx={{
            px:
              2,

            py:
              1.5,

            borderBottom:
              '1px solid',

            borderColor:
              'divider',
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight:
                600,
            }}
          >
            Alert Register
          </Typography>
        </Box>

        {alertsQuery.isLoading ? (
          <Box
            sx={{
              py:
                8,

              display:
                'flex',

              justifyContent:
                'center',
            }}
          >
            <CircularProgress />
          </Box>
        ) : alerts.length ===
          0 ? (
          <Box
            sx={{
              py:
                8,

              px:
                2,

              textAlign:
                'center',
            }}
          >
            <NotificationsActiveOutlined
              sx={{
                fontSize:
                  42,

                mb:
                  1,
              }}
            />

            <Typography
              variant="h6"
            >
              No alerts found
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mt:
                  0.5,
              }}
            >
              No alerts match the
              selected filters.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table
              size="small"
              sx={{
                minWidth:
                  1200,
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell>
                    Alert
                  </TableCell>

                  <TableCell>
                    Severity
                  </TableCell>

                  <TableCell>
                    Status
                  </TableCell>

                  <TableCell>
                    Recipient
                  </TableCell>

                  <TableCell>
                    Organization
                  </TableCell>

                  <TableCell>
                    Product
                  </TableCell>

                  <TableCell>
                    Detected
                  </TableCell>

                  <TableCell
                    align="right"
                  >
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {alerts.map(
                  (
                    alert,
                  ) => (
                    <TableRow
                      key={
                        alert.id
                      }
                      hover
                    >
                      {/* ALERT */}

                      <TableCell>
                        <Stack
                          spacing={
                            0.4
                          }
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight:
                                600,
                            }}
                          >
                            {
                              alert.title
                            }
                          </Typography>

                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            {formatAlertType(
                              alert.alertType,
                            )}
                          </Typography>

                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            {
                              alert.message
                            }
                          </Typography>
                        </Stack>
                      </TableCell>

                      {/* SEVERITY */}

                      <TableCell>
                        <Chip
                          size="small"
                          label={
                            alert.severity
                          }
                          color={getSeverityColor(
                            alert.severity,
                          )}
                          variant="outlined"
                        />
                      </TableCell>

                      {/* STATUS */}

                      <TableCell>
                        <Chip
                          size="small"
                          label={
                            alert.status
                          }
                          color={getStatusColor(
                            alert.status,
                          )}
                        />
                      </TableCell>

                      {/* RECIPIENT */}

                      <TableCell>
                        <Stack
                          spacing={
                            0.2
                          }
                        >
                          <Typography
                            variant="body2"
                          >
                            {recipientName(
                              alert,
                            )}
                          </Typography>

                          {alert
                            .recipient
                            ?.username && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {
                                alert
                                  .recipient
                                  .username
                              }
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>

                      {/* ORGANIZATION */}

                      <TableCell>
                        <Stack
                          spacing={
                            0.2
                          }
                        >
                          <Typography
                            variant="body2"
                          >
                            {alert
                              .branch
                              ?.name ??
                              '-'}
                          </Typography>

                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            {[
                              alert
                                .district
                                ?.name,

                              alert
                                .region
                                ?.name,
                            ]
                              .filter(
                                Boolean,
                              )
                              .join(
                                ' / ',
                              ) ||
                              '-'}
                          </Typography>
                        </Stack>
                      </TableCell>

                      {/* PRODUCT */}

                      <TableCell>
                        {alert
                          .product
                          ?.name ??
                          'Overall'}
                      </TableCell>

                      {/* DETECTED */}

                      <TableCell>
                        {formatDateTime(
                          alert.detectedAt,
                        )}
                      </TableCell>

                      {/* ACTIONS */}

                      <TableCell
                        align="right"
                      >
                        <Stack
                          direction="row"
                          spacing={
                            1
                          }
                          sx={{
                            justifyContent:
                              'flex-end',

                            alignItems:
                              'center',
                          }}
                        >
                          <Button
                            size="small"
                            variant="text"
                            startIcon={
                              <VisibilityOutlined />
                            }
                            onClick={() =>
                              handleViewAlert(
                                alert,
                              )
                            }
                          >
                            View
                          </Button>

                          {canUpdateAlerts &&
                            alert.status ===
                              'OPEN' && (
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() =>
                                  handleAcknowledge(
                                    alert.id,
                                  )
                                }
                                disabled={
                                  isUpdating
                                }
                              >
                                Acknowledge
                              </Button>
                            )}

                          {canUpdateAlerts &&
                            alert.status !==
                              'RESOLVED' &&
                            alert.status !==
                              'DISMISSED' && (
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() =>
                                  handleResolve(
                                    alert.id,
                                  )
                                }
                                disabled={
                                  isUpdating
                                }
                              >
                                Resolve
                              </Button>
                            )}

                          {canUpdateAlerts &&
                            (alert.status ===
                              'RESOLVED' ||
                              alert.status ===
                                'DISMISSED') && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Completed
                              </Typography>
                            )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* =====================================================================
          ALERT DETAIL DIALOG
      ===================================================================== */}

      <Dialog
        open={
          Boolean(
            selectedAlert,
          )
        }
        onClose={
          handleCloseAlert
        }
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          Alert Details
        </DialogTitle>

        <DialogContent
          dividers
        >
          {selectedAlert && (
            <Stack
              spacing={3}
            >
              {/* =============================================================
                  TITLE
              ============================================================= */}

              <Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight:
                      700,
                  }}
                >
                  {
                    selectedAlert.title
                  }
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mt:
                      0.5,
                  }}
                >
                  {
                    selectedAlert.message
                  }
                </Typography>
              </Box>

              {/* =============================================================
                  STATUS
              ============================================================= */}

              <Stack
                direction="row"
                spacing={1}
                sx={{
                  flexWrap:
                    'wrap',

                  rowGap:
                    1,
                }}
              >
                <Chip
                  label={
                    selectedAlert.severity
                  }
                  color={getSeverityColor(
                    selectedAlert.severity,
                  )}
                  variant="outlined"
                />

                <Chip
                  label={
                    selectedAlert.status
                  }
                  color={getStatusColor(
                    selectedAlert.status,
                  )}
                />

                <Chip
                  label={formatAlertType(
                    selectedAlert.alertType,
                  )}
                  variant="outlined"
                />
              </Stack>

              <Divider />

              {/* =============================================================
                  ORGANIZATION
              ============================================================= */}

              <Box
                sx={{
                  display:
                    'grid',

                  gridTemplateColumns: {
                    xs:
                      '1fr',

                    sm:
                      'repeat(2, minmax(0, 1fr))',
                  },

                  gap:
                    2,
                }}
              >
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    Region
                  </Typography>

                  <Typography>
                    {selectedAlert
                      .region
                      ?.name ??
                      '-'}
                  </Typography>
                </Box>

                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    District
                  </Typography>

                  <Typography>
                    {selectedAlert
                      .district
                      ?.name ??
                      '-'}
                  </Typography>
                </Box>

                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    Branch
                  </Typography>

                  <Typography>
                    {selectedAlert
                      .branch
                      ?.name ??
                      '-'}
                  </Typography>
                </Box>

                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    Product
                  </Typography>

                  <Typography>
                    {selectedAlert
                      .product
                      ?.name ??
                      'Overall'}
                  </Typography>
                </Box>

                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    Recipient
                  </Typography>

                  <Typography>
                    {recipientName(
                      selectedAlert,
                    )}
                  </Typography>

                  {selectedAlert
                    .recipient
                    ?.username && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                    >
                      {
                        selectedAlert
                          .recipient
                          .username
                      }
                    </Typography>
                  )}
                </Box>

                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    Scope
                  </Typography>

                  <Typography>
                    {formatAlertType(
                      selectedAlert.scopeType,
                    )}
                  </Typography>
                </Box>
              </Box>

              <Divider />

              {/* =============================================================
                  TIMESTAMPS
              ============================================================= */}

              <Box
                sx={{
                  display:
                    'grid',

                  gridTemplateColumns: {
                    xs:
                      '1fr',

                    sm:
                      'repeat(3, minmax(0, 1fr))',
                  },

                  gap:
                    2,
                }}
              >
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    Detected
                  </Typography>

                  <Typography>
                    {formatDateTime(
                      selectedAlert.detectedAt,
                    )}
                  </Typography>
                </Box>

                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    Acknowledged
                  </Typography>

                  <Typography>
                    {formatDateTime(
                      selectedAlert.acknowledgedAt,
                    )}
                  </Typography>
                </Box>

                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    Resolved
                  </Typography>

                  <Typography>
                    {formatDateTime(
                      selectedAlert.resolvedAt,
                    )}
                  </Typography>
                </Box>
              </Box>

              {/* =============================================================
                  METADATA
              ============================================================= */}

              {selectedAlert.metadata && (
                <>
                  <Divider />

                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        mb:
                          1,

                        fontWeight:
                          700,
                      }}
                    >
                      Metadata
                    </Typography>

                    <Box
                      component="pre"
                      sx={{
                        m:
                          0,

                        p:
                          2,

                        overflow:
                          'auto',

                        borderRadius:
                          1,

                        bgcolor:
                          'action.hover',

                        fontSize:
                          '0.8rem',

                        whiteSpace:
                          'pre-wrap',

                        wordBreak:
                          'break-word',
                      }}
                    >
                      {JSON.stringify(
                        selectedAlert.metadata,
                        null,
                        2,
                      )}
                    </Box>
                  </Box>
                </>
              )}
            </Stack>
          )}
        </DialogContent>

        {/* ===================================================================
            DIALOG ACTIONS
        =================================================================== */}

        <DialogActions
          sx={{
            px:
              3,

            py:
              2,
          }}
        >
          {selectedAlert &&
            canUpdateAlerts &&
            selectedAlert.status ===
              'OPEN' && (
              <Button
                variant="outlined"
                onClick={() =>
                  handleAcknowledge(
                    selectedAlert.id,
                  )
                }
                disabled={
                  isUpdating
                }
              >
                {acknowledgeMutation.isPending
                  ? 'Acknowledging...'
                  : 'Acknowledge'}
              </Button>
            )}

          {selectedAlert &&
            canUpdateAlerts &&
            selectedAlert.status !==
              'RESOLVED' &&
            selectedAlert.status !==
              'DISMISSED' && (
              <Button
                variant="contained"
                onClick={() =>
                  handleResolve(
                    selectedAlert.id,
                  )
                }
                disabled={
                  isUpdating
                }
              >
                {resolveMutation.isPending
                  ? 'Resolving...'
                  : 'Resolve'}
              </Button>
            )}

          <Button
            onClick={
              handleCloseAlert
            }
            disabled={
              isUpdating
            }
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}