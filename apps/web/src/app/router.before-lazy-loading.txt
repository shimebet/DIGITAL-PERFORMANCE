import { Navigate, createBrowserRouter } from "react-router-dom";

import { AuthLayout } from "../layouts/auth-layout";

import { AppLayout } from "../layouts/app-layout";

import { ProtectedRoute } from "../features/auth/protected-route";

import { AccessRoute } from "../features/auth/access-route";

import { ROLE } from "./navigation";

import { LoginPage } from "../pages/login-page";

import { DashboardPage } from "../pages/dashboard-page";

import { ChangePasswordPage } from "../pages/change-password-page";

import { ForbiddenPage } from "../pages/forbidden-page";

import { NotFoundPage } from "../pages/not-found-page";

import { ActivitiesPage } from "../pages/activities-page";

import { SubmissionsPage } from "../pages/submissions-page";

import { FollowUpsPage } from "../pages/follow-ups-page";

import { TargetsPage } from "../pages/targets-page";

import { PerformancePage } from "../pages/performance-page";

import { AlertsPage } from "../pages/alerts-page";

import { AiInsightsPage } from "../pages/ai-insights-page";

import { ReportsPage } from "../pages/reports-page";

import { RegionsPage } from "../pages/regions-page";

import { DistrictsPage } from "../pages/districts-page";

import { BranchesPage } from "../pages/branches-page";

import { UsersPage } from "../pages/users-page";

import { ProductsPage } from "../pages/products-page";

import { ProfilePage } from "../pages/profile-page";

// ============================================================================
// ROLE GROUPS
// ============================================================================

const ORGANIZATION_ADMIN_ROLES = [
  ROLE.SUPER_ADMIN,
  ROLE.SYSTEM_ADMIN,
  ROLE.REGIONAL_MANAGER,
  ROLE.DISTRICT_MANAGER,
];

const USER_ADMIN_ROLES = [ROLE.SUPER_ADMIN, ROLE.SYSTEM_ADMIN];

const PRODUCT_ADMIN_ROLES = [ROLE.SUPER_ADMIN, ROLE.SYSTEM_ADMIN];

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
  // ------------------------------------------------------------------------
  // PUBLIC / AUTH ROUTES
  // ------------------------------------------------------------------------

  {
    element: <AuthLayout />,

    children: [
      {
        path: "/login",

        element: <LoginPage />,
      },
    ],
  },

  // ------------------------------------------------------------------------
  // AUTHENTICATED ROUTES
  // ------------------------------------------------------------------------

  {
    element: <ProtectedRoute />,

    children: [
      // --------------------------------------------------------------------
      // CHANGE PASSWORD
      // --------------------------------------------------------------------

      {
        path: "/change-password",

        element: <ChangePasswordPage />,
      },

      // --------------------------------------------------------------------
      // MAIN APPLICATION
      // --------------------------------------------------------------------

      {
        element: <AppLayout />,

        children: [
          // ----------------------------------------------------------------
          // ROOT
          // ----------------------------------------------------------------

          {
            path: "/",

            element: <Navigate to="/dashboard" replace />,
          },

          // ----------------------------------------------------------------
          // DASHBOARD
          // ----------------------------------------------------------------

          {
            path: "/dashboard",

            element: (
              <AccessRoute permission="dashboard.read">
                <DashboardPage />
              </AccessRoute>
            ),
          },

          // ----------------------------------------------------------------
          // OPERATIONS
          // ----------------------------------------------------------------

          {
            path: "/activities",

            element: (
              <AccessRoute permission="activity.read">
                <ActivitiesPage />
              </AccessRoute>
            ),
          },

          {
            path: "/submissions",

            element: (
              <AccessRoute permission="submission.read">
                <SubmissionsPage />
              </AccessRoute>
            ),
          },

          {
            path: "/follow-ups",

            element: (
              <AccessRoute permission="followup.read">
                <FollowUpsPage />
              </AccessRoute>
            ),
          },

          {
            path: "/targets",

            element: (
              <AccessRoute permission="target.read">
                <TargetsPage />
              </AccessRoute>
            ),
          },

          // ----------------------------------------------------------------
          // MANAGEMENT / ANALYTICS
          // ----------------------------------------------------------------

          {
            path: "/performance",

            element: (
              <AccessRoute permission="report.read">
                <PerformancePage />
              </AccessRoute>
            ),
          },

          {
            path: "/alerts",

            element: (
              <AccessRoute permission="alert.read">
                <AlertsPage />
              </AccessRoute>
            ),
          },

          {
            path: "/ai-insights",

            element: (
              <AccessRoute permission="ai.read" roles={AI_ROLES}>
                <AiInsightsPage />
              </AccessRoute>
            ),
          },

          {
            path: "/reports",

            element: (
              <AccessRoute permission="report.read" roles={REPORT_ROLES}>
                <ReportsPage />
              </AccessRoute>
            ),
          },

          // ----------------------------------------------------------------
          // ADMINISTRATION - ORGANIZATION
          // ----------------------------------------------------------------

          {
            path: "/admin/regions",

            element: (
              <AccessRoute
                permission="region.read"
                roles={ORGANIZATION_ADMIN_ROLES}
              >
                <RegionsPage />
              </AccessRoute>
            ),
          },

          {
            path: "/admin/districts",

            element: (
              <AccessRoute
                permission="district.read"
                roles={ORGANIZATION_ADMIN_ROLES}
              >
                <DistrictsPage />
              </AccessRoute>
            ),
          },

          {
            path: "/admin/branches",

            element: (
              <AccessRoute
                permission="branch.read"
                roles={ORGANIZATION_ADMIN_ROLES}
              >
                <BranchesPage />
              </AccessRoute>
            ),
          },

          // ----------------------------------------------------------------
          // ADMINISTRATION - USERS / SECURITY
          // ----------------------------------------------------------------

   {
  path: "/admin/users",

  element: (
    <AccessRoute
      permission="user.read"
      roles={USER_ADMIN_ROLES}
      requireGlobalAdmin
    >
      <UsersPage />
    </AccessRoute>
  ),
},
          // ----------------------------------------------------------------
          // ADMINISTRATION - PRODUCTS
          // ----------------------------------------------------------------

          {
            path: "/admin/products",

            element: (
              <AccessRoute
                permission="product.read"
                roles={PRODUCT_ADMIN_ROLES}
              >
                <ProductsPage />
              </AccessRoute>
            ),
          },

          // ----------------------------------------------------------------
          // PROFILE
          // ----------------------------------------------------------------

          {
            path: "/profile",

            element: <ProfilePage />,
          },

          // ----------------------------------------------------------------
          // FORBIDDEN
          // ----------------------------------------------------------------

          {
            path: "/forbidden",

            element: <ForbiddenPage />,
          },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------------
  // NOT FOUND
  // ------------------------------------------------------------------------

  {
    path: "*",

    element: <NotFoundPage />,
  },
]);
