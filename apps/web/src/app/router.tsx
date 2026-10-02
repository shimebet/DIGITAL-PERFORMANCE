import {
  Navigate,
  createBrowserRouter,
} from 'react-router-dom';

import {
  AuthLayout,
} from '../layouts/auth-layout';

import {
  AppLayout,
} from '../layouts/app-layout';

import {
  ProtectedRoute,
} from '../features/auth/protected-route';

import {
  LoginPage,
} from '../pages/login-page';

import {
  DashboardPage,
} from '../pages/dashboard-page';

import {
  ChangePasswordPage,
} from '../pages/change-password-page';

import {
  ForbiddenPage,
} from '../pages/forbidden-page';

import {
  NotFoundPage,
} from '../pages/not-found-page';

import {
  ActivitiesPage,
} from '../pages/activities-page';

import {
  SubmissionsPage,
} from '../pages/submissions-page';

import {
  FollowUpsPage,
} from '../pages/follow-ups-page';

import {
  TargetsPage,
} from '../pages/targets-page';

import {
  PerformancePage,
} from '../pages/performance-page';

import {
  AlertsPage,
} from '../pages/alerts-page';

import {
  AiInsightsPage,
} from '../pages/ai-insights-page';

import {
  ReportsPage,
} from '../pages/reports-page';

import {
  RegionsPage,
} from '../pages/regions-page';

import {
  DistrictsPage,
} from '../pages/districts-page';

import {
  BranchesPage,
} from '../pages/branches-page';

import {
  UsersPage,
} from '../pages/users-page';

import {
  ProductsPage,
} from '../pages/products-page';

import {
  ProfilePage,
} from '../pages/profile-page';

export const router =
  createBrowserRouter([
    {
      element:
        <AuthLayout />,

      children: [
        {
          path:
            '/login',

          element:
            <LoginPage />,
        },
      ],
    },

    {
      element:
        <ProtectedRoute />,

      children: [
        {
          path:
            '/change-password',

          element:
            <ChangePasswordPage />,
        },

        {
          element:
            <AppLayout />,

          children: [
            {
              path:
                '/',

              element: (
                <Navigate
                  to="/dashboard"
                  replace
                />
              ),
            },

            {
              path:
                '/dashboard',

              element:
                <DashboardPage />,
            },

            {
              path:
                '/activities',

              element:
                <ActivitiesPage />,
            },

            {
              path:
                '/submissions',

              element:
                <SubmissionsPage />,
            },

            {
              path:
                '/follow-ups',

              element:
                <FollowUpsPage />,
            },

            {
              path:
                '/targets',

              element:
                <TargetsPage />,
            },

            {
              path:
                '/performance',

              element:
                <PerformancePage />,
            },

            {
              path:
                '/alerts',

              element:
                <AlertsPage />,
            },

            {
              path:
                '/ai-insights',

              element:
                <AiInsightsPage />,
            },

            {
              path:
                '/reports',

              element:
                <ReportsPage />,
            },

            {
              path:
                '/admin/regions',

              element:
                <RegionsPage />,
            },

            {
              path:
                '/admin/districts',

              element:
                <DistrictsPage />,
            },

            {
              path:
                '/admin/branches',

              element:
                <BranchesPage />,
            },

            {
              path:
                '/admin/users',

              element:
                <UsersPage />,
            },

            {
              path:
                '/admin/products',

              element:
                <ProductsPage />,
            },

            {
              path:
                '/profile',

              element:
                <ProfilePage />,
            },

            {
              path:
                '/forbidden',

              element:
                <ForbiddenPage />,
            },
          ],
        },
      ],
    },

    {
      path:
        '*',

      element:
        <NotFoundPage />,
    },
  ]);