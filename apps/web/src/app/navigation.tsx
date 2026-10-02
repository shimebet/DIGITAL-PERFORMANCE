import type {
  ReactNode,
} from 'react';

import {
  DashboardOutlined,
  AssignmentOutlined,
  FactCheckOutlined,
  GroupsOutlined,
  TrackChangesOutlined,
  InsightsOutlined,
  NotificationsOutlined,
  SmartToyOutlined,
  AssessmentOutlined,
  AccountTreeOutlined,
  AdminPanelSettingsOutlined,
  StorefrontOutlined,
} from '@mui/icons-material';

export interface NavigationItem {
  label: string;
  path: string;
  icon: ReactNode;

  permission?: string;

  roles?: string[];
}

export interface NavigationSection {
  label?: string;

  items: NavigationItem[];
}

export const navigationSections:
  NavigationSection[] = [
    {
      items: [
        {
          label:
            'Dashboard',

          path:
            '/dashboard',

          icon:
            <DashboardOutlined />,

          permission:
            'dashboard.read',
        },
      ],
    },

    {
      label:
        'Operations',

      items: [
        {
          label:
            'Activities',

          path:
            '/activities',

          icon:
            <AssignmentOutlined />,

          permission:
            'activity.read',
        },

        {
          label:
            'Submissions',

          path:
            '/submissions',

          icon:
            <FactCheckOutlined />,

          permission:
            'submission.read',
        },

        {
          label:
            'Follow-ups',

          path:
            '/follow-ups',

          icon:
            <GroupsOutlined />,

          permission:
            'followup.read',
        },

        {
          label:
            'Targets',

          path:
            '/targets',

          icon:
            <TrackChangesOutlined />,

          permission:
            'target.read',
        },
      ],
    },

    {
      label:
        'Management',

      items: [
        {
          label:
            'Performance',

          path:
            '/performance',

          icon:
            <InsightsOutlined />,

          permission:
            'report.read',
        },

        {
          label:
            'Alerts',

          path:
            '/alerts',

          icon:
            <NotificationsOutlined />,

          permission:
            'alert.read',
        },

        {
          label:
            'AI Insights',

          path:
            '/ai-insights',

          icon:
            <SmartToyOutlined />,

          permission:
            'ai.read',
        },

        {
          label:
            'Reports',

          path:
            '/reports',

          icon:
            <AssessmentOutlined />,

          permission:
            'report.read',
        },
      ],
    },

    {
      label:
        'Administration',

      items: [
        {
          label:
            'Regions',

          path:
            '/admin/regions',

          icon:
            <AccountTreeOutlined />,

          permission:
            'region.read',
        },

        {
          label:
            'Districts',

          path:
            '/admin/districts',

          icon:
            <AccountTreeOutlined />,

          permission:
            'district.read',
        },

        {
          label:
            'Branches',

          path:
            '/admin/branches',

          icon:
            <StorefrontOutlined />,

          permission:
            'branch.read',
        },

        {
          label:
            'Users',

          path:
            '/admin/users',

          icon:
            <AdminPanelSettingsOutlined />,

          permission:
            'user.read',
        },

        {
          label:
            'Products',

          path:
            '/admin/products',

          icon:
            <StorefrontOutlined />,

          permission:
            'product.read',
        },
      ],
    },
  ];