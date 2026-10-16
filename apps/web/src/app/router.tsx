import {
  lazy,
  Suspense,
} from 'react';

import {
  Navigate,
  createBrowserRouter,
} from 'react-router-dom';

import {
  Box,
  CircularProgress,
  Typography,
} from '@mui/material';

import { AuthLayout } from '../layouts/auth-layout';
import { AppLayout } from '../layouts/app-layout';
import { ProtectedRoute } from '../features/auth/protected-route';
import { AccessRoute } from '../features/auth/access-route';
import { ROLE } from './navigation';

// ============================================================================
// LAZY-LOADED PAGES
// ============================================================================

const LoginPage = lazy(() =>
  import('../pages/login-page').then((module) => ({
    default: module.LoginPage,
  })),
);

const DashboardPage = lazy(() =>
  import('../pages/dashboard-page').then((module) => ({
    default: module.DashboardPage,
  })),
);

const ChangePasswordPage = lazy(() =>
  import('../pages/change-password-page').then((module) => ({
    default: module.ChangePasswordPage,
  })),
);

const ForbiddenPage = lazy(() =>
  import('../pages/forbidden-page').then((module) => ({
    default: module.ForbiddenPage,
  })),
);

const NotFoundPage = lazy(() =>
  import('../pages/not-found-page').then((module) => ({
    default: module.NotFoundPage,
  })),
);

const ActivitiesPage = lazy(() =>
  import('../pages/activities-page').then((module) => ({
    default: module.ActivitiesPage,
  })),
);

const SubmissionsPage = lazy(() =>
  import('../pages/submissions-page').then((module) => ({
    default: module.SubmissionsPage,
  })),
);

const FollowUpsPage = lazy(() =>
  import('../pages/follow-ups-page').then((module) => ({
    default: module.FollowUpsPage,
  })),
);

const TargetsPage = lazy(() =>
  import('../pages/targets-page').then((module) => ({
    default: module.TargetsPage,
  })),
);

const PerformancePage = lazy(() =>
  import('../pages/performance-page').then((module) => ({
    default: module.PerformancePage,
  })),
);

const AlertsPage = lazy(() =>
  import('../pages/alerts-page').then((module) => ({
    default: module.AlertsPage,
  })),
);

const AiInsightsPage = lazy(() =>
  import('../pages/ai-insights-page').then((module) => ({
    default: module.AiInsightsPage,
  })),
);

const ReportsPage = lazy(() =>
  import('../pages/reports-page').then((module) => ({
    default: module.ReportsPage,
  })),
);

const RegionsPage = lazy(() =>
  import('../pages/regions-page').then((module) => ({
    default: module.RegionsPage,
  })),
);

const DistrictsPage = lazy(() =>
  import('../pages/districts-page').then((module) => ({
    default: module.DistrictsPage,
  })),
);

const BranchesPage = lazy(() =>
  import('../pages/branches-page').then((module) => ({
    default: module.BranchesPage,
  })),
);

const UsersPage = lazy(() =>
  import('../pages/users-page').then((module) => ({
    default: module.UsersPage,
  })),
);

const ProductsPage = lazy(() =>
  import('../pages/products-page').then((module) => ({
    default: module.ProductsPage,
  })),
);

const ProfilePage = lazy(() =>
  import('../pages/profile-page').then((module) => ({
    default: module.ProfilePage,
  })),
);

// ============================================================================
// LOADING FALLBACK
// ============================================================================

function PageLoading() {
  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        minHeight: '45vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      <CircularProgress size={36} />

      <Typography
        variant="body2"
        color="text.secondary"
      >
        Loading page...
      </Typography>
    </Box>
  );
}

function LazyPage({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<PageLoading />}>
      {children}
    </Suspense>
  );
}

// ============================================================================
// ROLE GROUPS
// ============================================================================

const ORGANIZATION_ADMIN_ROLES = [
  ROLE.SUPER_ADMIN,
  ROLE.SYSTEM_ADMIN,
  ROLE.REGIONAL_MANAGER,
  ROLE.DISTRICT_MANAGER,
];

const USER_ADMIN_ROLES = [
  ROLE.SUPER_ADMIN,
  ROLE.SYSTEM_ADMIN,
];

const PRODUCT_ADMIN_ROLES = [
  ROLE.SUPER_ADMIN,
  ROLE.SYSTEM_ADMIN,
];

const AI_ROLES = [
  ROLE.SUPER_ADMIN,
  ROLE.REGIONAL_MANAGER,
  ROLE.REGIONAL_ANALYST,
  ROLE.DISTRICT_MANAGER,
  ROLE.DISTRICT_ANALYST,
  ROLE.BRANCH_MANAGER,
  ROLE.AUDITOR,
];

const REPORT_ROLES = [
  ROLE.SUPER_ADMIN,
  ROLE.SYSTEM_ADMIN,
  ROLE.REGIONAL_MANAGER,
  ROLE.REGIONAL_ANALYST,
  ROLE.DISTRICT_MANAGER,
  ROLE.DISTRICT_ANALYST,
  ROLE.BRANCH_MANAGER,
  ROLE.AUDITOR,
  ROLE.READ_ONLY,
];

// ============================================================================
// ROUTER
// ============================================================================

export const router = createBrowserRouter([
  // PUBLIC / AUTH ROUTES
  {
    element: <AuthLayout />,
    children: [
      {
        path: '/login',
        element: (
          <LazyPage>
            <LoginPage />
          </LazyPage>
        ),
      },
    ],
  },

  // AUTHENTICATED ROUTES
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/change-password',
        element: (
          <LazyPage>
            <ChangePasswordPage />
          </LazyPage>
        ),
      },

      // MAIN APPLICATION
      {
        element: <AppLayout />,
        children: [
          {
            path: '/',
            element: (
              <Navigate
                to="/dashboard"
                replace
              />
            ),
          },

          // DASHBOARD
          {
            path: '/dashboard',
            element: (
              <AccessRoute permission="dashboard.read">
                <LazyPage>
                  <DashboardPage />
                </LazyPage>
              </AccessRoute>
            ),
          },

          // OPERATIONS
          {
            path: '/activities',
            element: (
              <AccessRoute permission="activity.read">
                <LazyPage>
                  <ActivitiesPage />
                </LazyPage>
              </AccessRoute>
            ),
          },

          {
            path: '/submissions',
            element: (
              <AccessRoute permission="submission.read">
                <LazyPage>
                  <SubmissionsPage />
                </LazyPage>
              </AccessRoute>
            ),
          },

          {
            path: '/follow-ups',
            element: (
              <AccessRoute permission="followup.read">
                <LazyPage>
                  <FollowUpsPage />
                </LazyPage>
              </AccessRoute>
            ),
          },

          {
            path: '/targets',
            element: (
              <AccessRoute permission="target.read">
                <LazyPage>
                  <TargetsPage />
                </LazyPage>
              </AccessRoute>
            ),
          },

          // MANAGEMENT / ANALYTICS
          {
            path: '/performance',
            element: (
              <AccessRoute permission="report.read">
                <LazyPage>
                  <PerformancePage />
                </LazyPage>
              </AccessRoute>
            ),
          },

          {
            path: '/alerts',
            element: (
              <AccessRoute permission="alert.read">
                <LazyPage>
                  <AlertsPage />
                </LazyPage>
              </AccessRoute>
            ),
          },

          {
            path: '/ai-insights',
            element: (
              <AccessRoute
                permission="ai.read"
                roles={AI_ROLES}
              >
                <LazyPage>
                  <AiInsightsPage />
                </LazyPage>
              </AccessRoute>
            ),
          },

          {
            path: '/reports',
            element: (
              <AccessRoute
                permission="report.read"
                roles={REPORT_ROLES}
              >
                <LazyPage>
                  <ReportsPage />
                </LazyPage>
              </AccessRoute>
            ),
          },

          // ADMINISTRATION - ORGANIZATION
          {
            path: '/admin/regions',
            element: (
              <AccessRoute
                permission="region.read"
                roles={ORGANIZATION_ADMIN_ROLES}
              >
                <LazyPage>
                  <RegionsPage />
                </LazyPage>
              </AccessRoute>
            ),
          },

          {
            path: '/admin/districts',
            element: (
              <AccessRoute
                permission="district.read"
                roles={ORGANIZATION_ADMIN_ROLES}
              >
                <LazyPage>
                  <DistrictsPage />
                </LazyPage>
              </AccessRoute>
            ),
          },

          {
            path: '/admin/branches',
            element: (
              <AccessRoute
                permission="branch.read"
                roles={ORGANIZATION_ADMIN_ROLES}
              >
                <LazyPage>
                  <BranchesPage />
                </LazyPage>
              </AccessRoute>
            ),
          },

          // ADMINISTRATION - USERS / SECURITY
          {
            path: '/admin/users',
            element: (
              <AccessRoute
                permission="user.read"
                roles={USER_ADMIN_ROLES}
                requireGlobalAdmin
              >
                <LazyPage>
                  <UsersPage />
                </LazyPage>
              </AccessRoute>
            ),
          },

          // ADMINISTRATION - PRODUCTS
          {
            path: '/admin/products',
            element: (
              <AccessRoute
                permission="product.read"
                roles={PRODUCT_ADMIN_ROLES}
              >
                <LazyPage>
                  <ProductsPage />
                </LazyPage>
              </AccessRoute>
            ),
          },

          // PROFILE
          {
            path: '/profile',
            element: (
              <LazyPage>
                <ProfilePage />
              </LazyPage>
            ),
          },

          // FORBIDDEN
          {
            path: '/forbidden',
            element: (
              <LazyPage>
                <ForbiddenPage />
              </LazyPage>
            ),
          },
        ],
      },
    ],
  },

  // NOT FOUND
  {
    path: '*',
    element: (
      <LazyPage>
        <NotFoundPage />
      </LazyPage>
    ),
  },
]);