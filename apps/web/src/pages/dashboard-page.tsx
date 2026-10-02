import {
  Alert,
  Box,
  CircularProgress,
  Typography,
} from '@mui/material';

import {
  AssignmentTurnedInOutlined,
  GroupsOutlined,
  HowToRegOutlined,
  PaymentsOutlined,
  TrackChangesOutlined,
  TrendingUpOutlined,
} from '@mui/icons-material';
import axios from 'axios';
import {
  useQuery,
} from '@tanstack/react-query';

import {
  getDailyTrendApi,
  getDashboardOverviewApi,
  getProductPerformanceApi,
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

export function DashboardPage() {
  const user =
    useAuthStore(
      (state) =>
        state.user,
    );

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

  const query = {
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

  const overviewQuery =
    useQuery({
      queryKey: [
        'dashboard-overview',
        query,
      ],

      queryFn: () =>
        getDashboardOverviewApi(
          query,
        ),
    });

  const trendQuery =
    useQuery({
      queryKey: [
        'dashboard-trend',
        query,
      ],

      queryFn: () =>
        getDailyTrendApi(
          query,
        ),
    });

  const productQuery =
    useQuery({
      queryKey: [
        'dashboard-products',
        query,
      ],

      queryFn: () =>
        getProductPerformanceApi(
          query,
        ),
    });

  const isLoading =
    overviewQuery.isLoading ||
    trendQuery.isLoading ||
    productQuery.isLoading;

  const hasError =
    overviewQuery.isError ||
    trendQuery.isError ||
    productQuery.isError;

  const overview =
    overviewQuery.data;

const dashboardError =
  overviewQuery.error ??
  trendQuery.error ??
  productQuery.error;

let dashboardErrorMessage =
  'Unable to load dashboard data.';

if (
  axios.isAxiosError(
    dashboardError,
  )
) {
  const status =
    dashboardError.response?.status;

  const data =
    dashboardError.response?.data as
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

  dashboardErrorMessage =
    `${status ?? 'Network error'}: ${
      message ??
      dashboardError.message
    }`;
}

  return (
    <Box
      sx={{
        p: {
          xs:
            2,

          md:
            3,
        },
      }}
    >
      <Box
        sx={{
          mb:
            3,
        }}
      >
        <Typography
          variant="h4"
        >
          Digital Performance Dashboard
        </Typography>

        <Typography
          color="text.secondary"
          sx={{
            mt:
              0.5,
          }}
        >
          Welcome,{' '}
          {user?.firstName}{' '}
          {user?.lastName}.
        </Typography>
      </Box>

      <Box
        sx={{
          mb:
            3,

          p:
            2,

          bgcolor:
            'background.paper',

          border:
            '1px solid',

          borderColor:
            'divider',

          borderRadius:
            2,
        }}
      >
        <OrganizationFilter />
      </Box>

      {hasError && (
  <Alert
    severity="error"
    sx={{
      mb: 3,
    }}
  >
    {dashboardErrorMessage}
  </Alert>
      )}

      {isLoading && (
        <Box
          sx={{
            minHeight:
              300,

            display:
              'grid',

            placeItems:
              'center',
          }}
        >
          <CircularProgress />
        </Box>
      )}

      {!isLoading &&
        overview && (
          <>
           <Box
  sx={{
    display:
      'grid',

    gridTemplateColumns: {
      xs:
        'minmax(0, 1fr)',

      lg:
        'minmax(0, 1.35fr) minmax(0, 1fr)',
    },

    alignItems:
      'stretch',

    gap:
      2.5,

    mb:
      3,
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

            <Box
              sx={{
                display:
                  'grid',

                gridTemplateColumns: {
                  xs:
                    '1fr',

                  xl:
                    'minmax(0, 1.4fr) minmax(0, 1fr)',
                },

                gap:
                  3,

                mb:
                  3,
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

            <Box
              sx={{
                display:
                  'grid',

                gridTemplateColumns: {
                  xs:
                    '1fr',

                  md:
                    'repeat(2, minmax(0, 1fr))',
                },

                gap:
                  3,
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

                  borderRadius:
                    2,

                  p:
                    3,
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    mb:
                      2,
                  }}
                >
                  Submission Summary
                </Typography>

                <Typography>
                  Total:{' '}
                  {
                    overview.submissions
                      .total
                  }
                </Typography>

                <Typography>
                  Submitted:{' '}
                  {
                    overview.submissions
                      .submitted
                  }
                </Typography>

                <Typography>
                  Reviewed:{' '}
                  {
                    overview.submissions
                      .reviewed
                  }
                </Typography>

                <Typography>
                  Approved:{' '}
                  {
                    overview.submissions
                      .approved
                  }
                </Typography>

                <Typography>
                  Returned:{' '}
                  {
                    overview.submissions
                      .returned
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

                  borderRadius:
                    2,

                  p:
                    3,
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    mb:
                      2,
                  }}
                >
                  Follow-up Summary
                </Typography>

                <Typography>
                  Total:{' '}
                  {
                    overview.followUps
                      .total
                  }
                </Typography>

                <Typography>
                  Open:{' '}
                  {
                    overview.followUps
                      .open
                  }
                </Typography>

                <Typography>
                  Converted:{' '}
                  {
                    overview.followUps
                      .converted
                  }
                </Typography>

                <Typography>
                  Rescheduled:{' '}
                  {
                    overview.followUps
                      .rescheduled
                  }
                </Typography>

                <Typography>
                  Overdue:{' '}
                  {
                    overview.followUps
                      .overdue
                  }
                </Typography>
              </Box>
            </Box>
          </>
        )}
    </Box>
  );
}