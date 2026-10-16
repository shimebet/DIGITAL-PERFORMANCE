// src/pages/performance-page.tsx

import axios from 'axios';
import {
  useEffect,
  useState,
} from 'react';

import {
  Alert,
  Box,
  CircularProgress,
  Typography,
} from '@mui/material';

import {
  AdsClickOutlined,
  GroupsOutlined,
  InsightsOutlined,
  PersonSearchOutlined,
  PhoneOutlined,
  PointOfSaleOutlined,
  SchoolOutlined,
  SyncAltOutlined,
  TrackChangesOutlined,
} from '@mui/icons-material';

import {
  useQuery,
} from '@tanstack/react-query';

import {
  getBranchRankingApi,
  getDailyTrendApi,
  getPerformanceSummaryApi,
  getProductPerformanceApi,
  getStaffRankingApi,
} from '../api/dashboard.api';

import {
  KpiCard,
} from '../components/dashboard/kpi-card';

import {
  PerformanceTrendChart,
} from '../components/dashboard/performance-trend-chart';

import {
  ProductPerformanceChart,
} from '../components/dashboard/product-performance-chart';

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
  DashboardQuery,
} from '../types/dashboard.types';


import {
  BranchPerformanceRanking,
} from '../components/performance/branch-performance-ranking';

import {
  StaffPerformanceRanking,
} from '../components/performance/staff-performance-ranking';

// ============================================================================
// ERROR HANDLING
// ============================================================================

function getPerformanceErrorMessage(
  error: unknown,
) {
  if (
    axios.isAxiosError(
      error,
    )
  ) {
    const status =
      error.response?.status;

    const data =
      error.response?.data as
        | {
            message?:
              | string
              | string[];
          }
        | undefined;

    const message =
      Array.isArray(
        data?.message,
      )
        ? data.message.join(
            ', ',
          )
        : data?.message;

    if (message) {
      return `${
        status ??
        'Network error'
      }: ${message}`;
    }

    return (
      error.message ||
      'Unable to load performance data.'
    );
  }

  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return 'Unable to load performance data.';
}

// ============================================================================
// PERFORMANCE PAGE
// ============================================================================

export function PerformancePage() {
  // ==========================================================================
  // AUTHENTICATED USER
  // ==========================================================================

  const user =
    useAuthStore(
      (state) =>
        state.user,
    );

  // ==========================================================================
  // GLOBAL FILTERS
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
  // LOCAL BRANCH DRILL-DOWN
  // ==========================================================================

  const [
    selectedBranchId,
    setSelectedBranchId,
  ] =
    useState<
      string | undefined
    >(
      branchId ||
        undefined,
    );

  useEffect(
    () => {
      setSelectedBranchId(
        branchId ||
          undefined,
      );
    },
    [
      regionId,
      districtId,
      branchId,
    ],
  );

  // ==========================================================================
  // API QUERY
  // ==========================================================================

  const query:
    DashboardQuery = {
      regionId:
        regionId ||
        undefined,

      districtId:
        districtId ||
        undefined,

      branchId:
        branchId ||
        undefined,

      productId:
        productId ||
        undefined,

      startDate:
        startDate ||
        undefined,

      endDate:
        endDate ||
        undefined,
    };

  // ==========================================================================
  // PERFORMANCE SUMMARY
  // ==========================================================================

  const summaryQuery =
    useQuery({
      queryKey: [
        'performance-summary',
        user?.id,
        query,
      ],

      queryFn: () =>
        getPerformanceSummaryApi(
          query,
        ),
    });

  // ==========================================================================
  // DAILY TREND
  // ==========================================================================

  const trendQuery =
    useQuery({
      queryKey: [
        'performance-daily-trend',
        user?.id,
        query,
      ],

      queryFn: () =>
        getDailyTrendApi(
          query,
        ),
    });

  // ==========================================================================
  // PRODUCT PERFORMANCE
  // ==========================================================================

  const productQuery =
    useQuery({
      queryKey: [
        'performance-products',
        user?.id,
        query,
      ],

      queryFn: () =>
        getProductPerformanceApi(
          query,
        ),
    });



      // ==========================================================================
  // BRANCH RANKING
  // ==========================================================================

  const branchRankingQuery =
    useQuery({
      queryKey: [
        'performance-branch-ranking',
        user?.id,
        query,
      ],

      queryFn: () =>
        getBranchRankingApi(
          query,
        ),
    });

  // ==========================================================================
  // STAFF RANKING
  // ==========================================================================

  const staffRankingQuery:
    DashboardQuery = {
      ...query,

      branchId:
        selectedBranchId ||
        branchId ||
        undefined,
    };

  const staffRankingQueryResult =
    useQuery({
      queryKey: [
        'performance-staff-ranking',
        user?.id,
        staffRankingQuery,
      ],

      queryFn: () =>
        getStaffRankingApi(
          staffRankingQuery,
        ),
    });

  const selectedBranch =
    branchRankingQuery.data?.find(
      (row) =>
        row.branchId ===
        selectedBranchId,
    );
  // ==========================================================================
  // LOADING / ERROR
  // ==========================================================================

    const isLoading =
    summaryQuery.isLoading ||
    trendQuery.isLoading ||
    productQuery.isLoading ||
    branchRankingQuery.isLoading ||
    staffRankingQueryResult.isLoading;

  const hasError =
    summaryQuery.isError ||
    trendQuery.isError ||
    productQuery.isError ||
    branchRankingQuery.isError ||
    staffRankingQueryResult.isError;

  const performanceError =
    summaryQuery.error ??
    trendQuery.error ??
    productQuery.error ??
    branchRankingQuery.error ??
    staffRankingQueryResult.error;

  const summary =
    summaryQuery.data;

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <Box
      sx={{
        p: {
          xs: 2,
          md: 3,
        },
      }}
    >
      {/* =====================================================================
          PAGE HEADER
      ===================================================================== */}

      <Box
        sx={{
          mb: 3,
        }}
      >
        <Typography
          variant="h4"
        >
          Performance Analytics
        </Typography>

        <Typography
          color="text.secondary"
          sx={{
            mt: 0.5,
          }}
        >
          Analyze activities,
          customer engagement,
          conversion,
          activations,
          transactions,
          targets and
          achievement across
          your authorized
          organizational scope.
        </Typography>
      </Box>

      {/* =====================================================================
          FILTERS
      ===================================================================== */}

      <Box
        sx={{
          mb: 3,

          p: 2,

          bgcolor:
            'background.paper',

          border:
            '1px solid',

          borderColor:
            'divider',

          borderRadius: 2,
        }}
      >
        <OrganizationFilter />
      </Box>

      {/* =====================================================================
          ERROR
      ===================================================================== */}

      {hasError && (
        <Alert
          severity="error"
          sx={{
            mb: 3,
          }}
        >
          {getPerformanceErrorMessage(
            performanceError,
          )}
        </Alert>
      )}

      {/* =====================================================================
          LOADING
      ===================================================================== */}

      {isLoading && (
        <Box
          sx={{
            minHeight: 320,

            display: 'grid',

            placeItems:
              'center',
          }}
        >
          <CircularProgress />
        </Box>
      )}

      {/* =====================================================================
          CONTENT
      ===================================================================== */}

      {!isLoading &&
        summary && (
          <>
            {/* ===============================================================
                KPI CARDS
            =============================================================== */}

            <Box
              sx={{
                display:
                  'grid',

                gridTemplateColumns:
                  {
                    xs: '1fr',

                    sm: 'repeat(2, minmax(0, 1fr))',

                    md: 'repeat(3, minmax(0, 1fr))',

                    lg: 'repeat(4, minmax(0, 1fr))',

                    xl: 'repeat(5, minmax(0, 1fr))',
                  },

                gap: 2,

                mb: 3,
              }}
            >
              <KpiCard
                title="Target"
                value={
                  summary
                    .achievement
                    .target
                }
                subtitle={
                  productId
                    ? 'Selected product target'
                    : 'Activation target'
                }
                icon={
                  <TrackChangesOutlined />
                }
              />

              <KpiCard
                title="Customer Visits"
                value={
                  summary
                    .activity
                    .customerVisits
                }
                subtitle="Recorded visits"
                icon={
                  <PersonSearchOutlined />
                }
              />

              <KpiCard
                title="Phone Calls"
                value={
                  summary
                    .activity
                    .phoneCalls
                }
                subtitle="Recorded calls"
                icon={
                  <PhoneOutlined />
                }
              />

              <KpiCard
                title="Customers Contacted"
                value={
                  summary
                    .activity
                    .customersContacted
                }
                subtitle="Customers contacted"
                icon={
                  <GroupsOutlined />
                }
              />

              <KpiCard
                title="Customers Educated"
                value={
                  summary
                    .activity
                    .customersEducated
                }
                subtitle={
                  productId
                    ? 'Activity-level education'
                    : 'Customers educated'
                }
                icon={
                  <SchoolOutlined />
                }
              />

              <KpiCard
                title="Activations"
                value={
                  summary
                    .activation
                    .activations
                }
                subtitle={
                  productId
                    ? 'Selected product'
                    : 'Total activations'
                }
                icon={
                  <AdsClickOutlined />
                }
              />

              <KpiCard
                title="Reactivations"
                value={
                  summary
                    .activation
                    .reactivations
                }
                subtitle="Total reactivations"
                icon={
                  <SyncAltOutlined />
                }
              />

              <KpiCard
                title="Transactions"
                value={
                  summary
                    .transaction
                    .transactions
                }
                subtitle={
                  productId
                    ? 'Selected product'
                    : 'Total transactions'
                }
                icon={
                  <PointOfSaleOutlined />
                }
              />

              <KpiCard
                title="Conversion"
                value={`${summary.conversion.rate.toFixed(
                  1,
                )}%`}
                subtitle={
                  productId
                    ? 'Activations / engaged'
                    : 'Activations / educated'
                }
                icon={
                  <GroupsOutlined />
                }
              />

              <KpiCard
                title="Achievement"
                value={`${summary.achievement.percentage.toFixed(
                  1,
                )}%`}
                subtitle="Activations / target"
                icon={
                  <InsightsOutlined />
                }
              />
            </Box>

            {/* ===============================================================
                SECONDARY PERFORMANCE METRICS
            =============================================================== */}

            <Box
              sx={{
                display:
                  'grid',

                gridTemplateColumns:
                  {
                    xs: '1fr',

                    sm: 'repeat(2, minmax(0, 1fr))',

                    lg: 'repeat(4, minmax(0, 1fr))',
                  },

                gap: 2,

                mb: 3,
              }}
            >
              <Box
                sx={{
                  bgcolor:
                    'background.paper',

                  border:
                    '1px solid',

                  borderColor:
                    'divider',

                  borderRadius: 2,

                  p: 2.5,
                }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  Activity Records
                </Typography>

                <Typography
                  variant="h5"
                  sx={{
                    mt: 0.5,
                  }}
                >
                  {
                    summary.activityCount
                  }
                </Typography>
              </Box>

              <Box
                sx={{
                  bgcolor:
                    'background.paper',

                  border:
                    '1px solid',

                  borderColor:
                    'divider',

                  borderRadius: 2,

                  p: 2.5,
                }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  Transaction
                  Conversion
                </Typography>

                <Typography
                  variant="h5"
                  sx={{
                    mt: 0.5,
                  }}
                >
                  {summary.transaction.conversionRate.toFixed(
                    1,
                  )}
                  %
                </Typography>

                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  Transactions /
                  activations
                </Typography>
              </Box>

              <Box
                sx={{
                  bgcolor:
                    'background.paper',

                  border:
                    '1px solid',

                  borderColor:
                    'divider',

                  borderRadius: 2,

                  p: 2.5,
                }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  Achievement
                  Value
                </Typography>

                <Typography
                  variant="h5"
                  sx={{
                    mt: 0.5,
                  }}
                >
                  {
                    summary
                      .achievement
                      .value
                  }
                </Typography>

                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  Activations
                  achieved
                </Typography>
              </Box>

              <Box
                sx={{
                  bgcolor:
                    'background.paper',

                  border:
                    '1px solid',

                  borderColor:
                    'divider',

                  borderRadius: 2,

                  p: 2.5,
                }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  Remaining Target
                </Typography>

                <Typography
                  variant="h5"
                  sx={{
                    mt: 0.5,
                  }}
                >
                  {Math.max(
                    0,
                    summary
                      .achievement
                      .target -
                      summary
                        .achievement
                        .value,
                  )}
                </Typography>

                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  Activations still
                  required
                </Typography>
              </Box>
            </Box>

            {/* ===============================================================
                ANALYTICS
            =============================================================== */}

            <Box
              sx={{
                display:
                  'grid',

                gridTemplateColumns:
                  {
                    xs: '1fr',

                    xl: 'minmax(0, 1.35fr) minmax(0, 1fr)',
                  },

                alignItems:
                  'stretch',

                gap: 2.5,

                mb: 3,
              }}
            >
              <PerformanceTrendChart
                data={
                  trendQuery.data ??
                  []
                }
              />

              <ProductPerformanceChart
                data={
                  productQuery.data ??
                  []
                }
              />
            </Box>

            {/* ===============================================================
                BRANCH RANKING
            =============================================================== */}

            <Box
              sx={{
                mb: 3,
              }}
            >
              <BranchPerformanceRanking
                data={
                  branchRankingQuery.data ??
                  []
                }
                selectedBranchId={
                  selectedBranchId
                }
                onSelectBranch={(
                  selectedId,
                ) => {
                  setSelectedBranchId(
                    selectedBranchId ===
                      selectedId
                      ? undefined
                      : selectedId,
                  );
                }}
              />
            </Box>

            {/* ===============================================================
                STAFF RANKING
            =============================================================== */}

            <Box
              sx={{
                mb: 3,
              }}
            >
              <StaffPerformanceRanking
                data={
                  staffRankingQueryResult.data ??
                  []
                }
                selectedBranchName={
                  selectedBranch?.branchName
                }
              />
            </Box>
            {/* ===============================================================
                PERIOD INFORMATION
            =============================================================== */}

            <Box
              sx={{
                bgcolor:
                  'background.paper',

                border:
                  '1px solid',

                borderColor:
                  'divider',

                borderRadius: 2,

                p: 2.5,
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  mb: 2,
                }}
              >
                Performance Period
              </Typography>

              <Box
                sx={{
                  display:
                    'grid',

                  gridTemplateColumns:
                    {
                      xs: '1fr',

                      sm: 'repeat(2, minmax(0, 1fr))',

                      md: 'repeat(4, minmax(0, 1fr))',
                    },

                  gap: 2,
                }}
              >
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    Start Date
                  </Typography>

                  <Typography>
                    {new Date(
                      summary.period.startDate,
                    ).toLocaleDateString()}
                  </Typography>
                </Box>

                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    End Date
                  </Typography>

                  <Typography>
                    {new Date(
                      summary.period.endDate,
                    ).toLocaleDateString()}
                  </Typography>
                </Box>

                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    Target
                  </Typography>

                  <Typography>
                    {
                      summary
                        .achievement
                        .target
                    }
                  </Typography>
                </Box>

                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    Achievement
                  </Typography>

                  <Typography>
                    {summary.achievement.percentage.toFixed(
                      1,
                    )}
                    %
                  </Typography>
                </Box>
              </Box>
            </Box>
          </>
        )}
    </Box>
  );
}