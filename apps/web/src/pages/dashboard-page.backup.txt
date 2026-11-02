import axios from "axios";

import { Alert, Box, CircularProgress, Typography } from "@mui/material";

import {
  AdsClickOutlined,
  GroupsOutlined,
  InsightsOutlined,
  PersonSearchOutlined,
  PointOfSaleOutlined,
  SchoolOutlined,
  TrackChangesOutlined,
} from "@mui/icons-material";

import { useQuery } from "@tanstack/react-query";

import {
  getBranchPerformanceApi,
  getDailyTrendApi,
  getDashboardOverviewApi,
  getProductPerformanceApi,
} from "../api/dashboard.api";

import { BranchPerformanceTable } from "../components/dashboard/branch-performance-table";

import { KpiCard } from "../components/dashboard/kpi-card";

import { PerformanceTrendChart } from "../components/dashboard/performance-trend-chart";

import { ProductPerformanceChart } from "../components/dashboard/product-performance-chart";

import { OrganizationFilter } from "../components/filters/organization-filter";

import { useAuthStore } from "../stores/auth.store";

import { useFilterStore } from "../stores/filter.store";

// ============================================================================
// ERROR HANDLING
// ============================================================================

function getDashboardErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;

    const data = error.response?.data as
      | {
          message?: string | string[];
        }
      | undefined;

    const message = Array.isArray(data?.message)
      ? data.message.join(", ")
      : data?.message;

    if (message) {
      return `${status ?? "Network error"}: ${message}`;
    }

    return error.message || "Unable to load dashboard data.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load dashboard data.";
}

// ============================================================================
// SUMMARY PANEL
// ============================================================================

interface SummaryPanelProps {
  title: string;

  items: Array<{
    label: string;

    value: string | number;
  }>;
}

function SummaryPanel({ title, items }: SummaryPanelProps) {
  return (
    <Box
      sx={{
        bgcolor: "background.paper",

        border: "1px solid",

        borderColor: "divider",

        borderRadius: 2,

        p: 3,

        height: "100%",
      }}
    >
      <Typography
        variant="h6"
        sx={{
          mb: 2,
        }}
      >
        {title}
      </Typography>

      <Box
        sx={{
          display: "grid",

          gridTemplateColumns: {
            xs: "1fr",

            sm: "repeat(2, minmax(0, 1fr))",
          },

          gap: 2,
        }}
      >
        {items.map((item) => (
          <Box
            key={item.label}
            sx={{
              p: 1.5,

              border: "1px solid",

              borderColor: "divider",

              borderRadius: 2,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              {item.label}
            </Typography>

            <Typography
              variant="h6"
              sx={{
                mt: 0.25,
              }}
            >
              {item.value}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// ============================================================================
// DASHBOARD
// ============================================================================

export function DashboardPage() {
  // ==========================================================================
  // AUTHENTICATED USER
  // ==========================================================================

  const user = useAuthStore((state) => state.user);

  // ==========================================================================
  // GLOBAL DASHBOARD FILTERS
  // ==========================================================================

  const regionId = useFilterStore((state) => state.regionId);

  const districtId = useFilterStore((state) => state.districtId);

  const branchId = useFilterStore((state) => state.branchId);

  const productId = useFilterStore((state) => state.productId);

  const startDate = useFilterStore((state) => state.startDate);

  const endDate = useFilterStore((state) => state.endDate);

  // ==========================================================================
  // API QUERY
  // ==========================================================================

const isDigitalStaff =
  user?.roles?.includes("DIGITAL_RESKILLED_STAFF") === true;

const query = {
  regionId: isDigitalStaff ? undefined : regionId || undefined,
  districtId: isDigitalStaff ? undefined : districtId || undefined,
  branchId: isDigitalStaff ? undefined : branchId || undefined,
  productId: productId || undefined,
  startDate: startDate || undefined,
  endDate: endDate || undefined,
};

  // ==========================================================================
  // OVERVIEW
  // ==========================================================================

  const overviewQuery = useQuery({
    queryKey: [
  "dashboard-overview",
  user?.id,
  query,
],

    queryFn: () => getDashboardOverviewApi(query),
  });

  // ==========================================================================
  // DAILY TREND
  // ==========================================================================

  const trendQuery = useQuery({
    queryKey: [
  "dashboard-trend",
  user?.id,
  query,
],

    queryFn: () => getDailyTrendApi(query),
  });

  // ==========================================================================
  // PRODUCT PERFORMANCE
  // ==========================================================================

  const productQuery = useQuery({
    queryKey: [
  "dashboard-products",
  user?.id,
  query,
],

    queryFn: () => getProductPerformanceApi(query),
  });

  // ==========================================================================
  // BRANCH PERFORMANCE
  // ==========================================================================

  const branchQuery = useQuery({
    queryKey: [
  "dashboard-branches",
  user?.id,
  query,
],

    queryFn: () => getBranchPerformanceApi(query),
  });

  // ==========================================================================
  // LOADING / ERROR
  // ==========================================================================

  const isLoading =
    overviewQuery.isLoading ||
    trendQuery.isLoading ||
    productQuery.isLoading ||
    branchQuery.isLoading;

  const hasError =
    overviewQuery.isError ||
    trendQuery.isError ||
    productQuery.isError ||
    branchQuery.isError;

  const dashboardError =
    overviewQuery.error ??
    trendQuery.error ??
    productQuery.error ??
    branchQuery.error;

  const overview = overviewQuery.data;

  // ==========================================================================
// TARGET DISPLAY POLICY
//
// A positive target means an applicable target assignment exists.
//
// A zero target is currently treated as "not assigned" because the API
// does not yet distinguish an unassigned target from an explicit zero target.
//
// Monthly targets are never prorated for partial-month reporting.
// ==========================================================================

const hasAssignedTarget =
  overview !== undefined &&
  Number(overview.performance.achievement.target) > 0;

const targetDisplayValue = hasAssignedTarget
  ? overview.performance.achievement.target
  : "Not assigned";

const achievementDisplayValue = hasAssignedTarget
  ? `${overview.performance.achievement.percentage.toFixed(1)}%`
  : "N/A";
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
        <Typography variant="h4">Digital Performance Dashboard</Typography>

        <Typography
          color="text.secondary"
          sx={{
            mt: 0.5,
          }}
        >
          Welcome, {user?.firstName} {user?.lastName}.
        </Typography>
      </Box>

      {/* =====================================================================
          FILTERS
      ===================================================================== */}

      <Box
        sx={{
          mb: 3,

          p: 2,

          bgcolor: "background.paper",

          border: "1px solid",

          borderColor: "divider",

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
          {getDashboardErrorMessage(dashboardError)}
        </Alert>
      )}

      {/* =====================================================================
          LOADING
      ===================================================================== */}

      {isLoading && (
        <Box
          sx={{
            minHeight: 300,

            display: "grid",

            placeItems: "center",
          }}
        >
          <CircularProgress />
        </Box>
      )}

      {/* =====================================================================
          CONTENT
      ===================================================================== */}

      {!isLoading && overview && (
        <>
          {/* ===============================================================
                KPI SUMMARY
            =============================================================== */}

          <Box
            sx={{
              display: "grid",

gridTemplateColumns: {
  xs: "1fr",

  sm: "repeat(2, minmax(0, 1fr))",

  md: "repeat(3, minmax(0, 1fr))",

  lg: "repeat(4, minmax(0, 1fr))",

  xl: "repeat(4, minmax(0, 1fr))",
},

              gap: 2,

              mb: 3,
            }}
          >
 <KpiCard
  title="Target"
  value={targetDisplayValue}
  subtitle={
    !hasAssignedTarget
      ? "No applicable target assigned"
      : productId
        ? "Selected product target"
        : "Full-period activation target"
  }
  icon={<TrackChangesOutlined />}
/>

            <KpiCard
              title="Customer Visits"
              value={overview.performance.activity.customerVisits}
              subtitle={productId ? "All activity visits" : "Recorded visits"}
              icon={<PersonSearchOutlined />}
            />

            <KpiCard
              title="Customers Educated"
              value={overview.performance.activity.customersEducated}
              subtitle={
                productId ? "All activity education" : "Customers educated"
              }
              icon={<SchoolOutlined />}
            />

            <KpiCard
              title="Activations"
              value={overview.performance.activation.activations}
              subtitle={productId ? "Selected product" : "Total activations"}
              icon={<AdsClickOutlined />}
            />

            <KpiCard
              title="Transactions"
              value={overview.performance.transaction.transactions}
              subtitle={productId ? "Selected product" : "Total transactions"}
              icon={<PointOfSaleOutlined />}
            />

            <KpiCard
              title="Conversion"
              value={`${overview.performance.conversion.rate.toFixed(1)}%`}
              subtitle={
                productId ? "Activations / engaged" : "Activations / educated"
              }
              icon={<GroupsOutlined />}
            />

<KpiCard
  title="Achievement"
  value={achievementDisplayValue}
  subtitle={
    hasAssignedTarget
      ? "Activations / full target"
      : "Target not assigned"
  }
  icon={<InsightsOutlined />}
/>
          </Box>

          {/* ===============================================================
                PRIMARY ANALYTICS
            =============================================================== */}

          <Box
            sx={{
              display: "grid",

              gridTemplateColumns: {
                xs: "1fr",

                xl: "minmax(0, 1.35fr) minmax(0, 1fr)",
              },

              alignItems: "stretch",

              gap: 2.5,

              mb: 3,
            }}
          >
            <PerformanceTrendChart data={trendQuery.data ?? []} />

            <ProductPerformanceChart data={productQuery.data ?? []} />
          </Box>

          {/* ===============================================================
                BRANCH PERFORMANCE
            =============================================================== */}

          <Box
            sx={{
              mb: 3,
            }}
          >
            <BranchPerformanceTable data={branchQuery.data ?? []} />
          </Box>

          {/* ===============================================================
                OPERATIONAL SUMMARIES
            =============================================================== */}

          <Box
            sx={{
              display: "grid",

              gridTemplateColumns: {
                xs: "1fr",

                lg: "repeat(2, minmax(0, 1fr))",
              },

              gap: 3,
            }}
          >
            <SummaryPanel
              title="Submission Summary"
              items={[
                {
                  label: "Total",

                  value: overview.submissions.total,
                },

                {
                  label: "Submitted",

                  value: overview.submissions.submitted,
                },

                {
                  label: "Resubmitted",

                  value: overview.submissions.resubmitted,
                },

                {
                  label: "Reviewed",

                  value: overview.submissions.reviewed,
                },

                {
                  label: "Approved",

                  value: overview.submissions.approved,
                },

                {
                  label: "Returned for Correction",

                  value: overview.submissions.returned,
                },
              ]}
            />

            <SummaryPanel
              title="Follow-up Summary"
              items={[
                {
                  label: "Total",

                  value: overview.followUps.total,
                },

                {
                  label: "Open",

                  value: overview.followUps.open,
                },

                {
                  label: "Contacted",

                  value: overview.followUps.contacted,
                },

                {
                  label: "Converted",

                  value: overview.followUps.converted,
                },

                {
                  label: "Rescheduled",

                  value: overview.followUps.rescheduled,
                },

                {
                  label: "Overdue",

                  value: overview.followUps.overdue,
                },
              ]}
            />
          </Box>
        </>
      )}
    </Box>
  );
}
