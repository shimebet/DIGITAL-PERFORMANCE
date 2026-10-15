import type { ReactNode } from "react";

import {
  AccountTreeOutlined,
  AdminPanelSettingsOutlined,
  AssessmentOutlined,
  AssignmentOutlined,
  DashboardOutlined,
  FactCheckOutlined,
  GroupsOutlined,
  InsightsOutlined,
  NotificationsOutlined,
  SmartToyOutlined,
  StorefrontOutlined,
  TrackChangesOutlined,
} from "@mui/icons-material";

// ============================================================================
// ROLE CONSTANTS
// ============================================================================

export const ROLE = {
  SUPER_ADMIN: "SUPER_ADMIN",

  SYSTEM_ADMIN: "SYSTEM_ADMIN",

  REGIONAL_MANAGER: "REGIONAL_MANAGER",

  REGIONAL_ANALYST: "REGIONAL_ANALYST",

  DISTRICT_MANAGER: "DISTRICT_MANAGER",

  DISTRICT_ANALYST: "DISTRICT_ANALYST",

  BRANCH_MANAGER: "BRANCH_MANAGER",

  DIGITAL_RESKILLED_STAFF: "DIGITAL_RESKILLED_STAFF",

  AUDITOR: "AUDITOR",

  READ_ONLY: "READ_ONLY",
} as const;

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
// TYPES
// ============================================================================

export interface NavigationItem {
  label: string;

  path: string;

  icon: ReactNode;

  /*
   * Required backend permission.
   */
  permission?: string;

  /*
   * Optional sidebar visibility restriction.
   *
   * This is UI-level visibility only.
   * Backend authorization remains enforced separately.
   */
  roles?: string[];
}

export interface NavigationSection {
  label?: string;

  items: NavigationItem[];
}

// ============================================================================
// NAVIGATION
// ============================================================================

export const navigationSections: NavigationSection[] = [
  // ------------------------------------------------------------------------
  // DASHBOARD
  // ------------------------------------------------------------------------

  {
    items: [
      {
        label: "Dashboard",

        path: "/dashboard",

        icon: <DashboardOutlined />,

        permission: "dashboard.read",
      },
    ],
  },

  // ------------------------------------------------------------------------
  // OPERATIONS
  // ------------------------------------------------------------------------

  {
    label: "Operations",

    items: [
      {
        label: "Activities",

        path: "/activities",

        icon: <AssignmentOutlined />,

        permission: "activity.read",
      },

      {
        label: "Submissions",

        path: "/submissions",

        icon: <FactCheckOutlined />,

        permission: "submission.read",
      },

      {
        label: "Follow-ups",

        path: "/follow-ups",

        icon: <GroupsOutlined />,

        permission: "followup.read",
      },

      {
        label: "Targets",

        path: "/targets",

        icon: <TrackChangesOutlined />,

        permission: "target.read",
      },
    ],
  },

  // ------------------------------------------------------------------------
  // MANAGEMENT
  // ------------------------------------------------------------------------

  {
    label: "Management",

    items: [
      {
        label: "Performance",

        path: "/performance",

        icon: <InsightsOutlined />,

        permission: "report.read",
      },

      {
        label: "Alerts",

        path: "/alerts",

        icon: <NotificationsOutlined />,

        permission: "alert.read",
      },

      {
        label: "AI Insights",

        path: "/ai-insights",

        icon: <SmartToyOutlined />,

        permission: "ai.read",

        roles: AI_ROLES,
      },

      {
        label: "Reports",

        path: "/reports",

        icon: <AssessmentOutlined />,

        permission: "report.read",

        roles: REPORT_ROLES,
      },
    ],
  },

  // ------------------------------------------------------------------------
  // ADMINISTRATION
  // ------------------------------------------------------------------------

  {
    label: "Administration",

    items: [
      {
        label: "Regions",

        path: "/admin/regions",

        icon: <AccountTreeOutlined />,

        permission: "region.read",

        roles: ORGANIZATION_ADMIN_ROLES,
      },

      {
        label: "Districts",

        path: "/admin/districts",

        icon: <AccountTreeOutlined />,

        permission: "district.read",

        roles: ORGANIZATION_ADMIN_ROLES,
      },

      {
        label: "Branches",

        path: "/admin/branches",

        icon: <StorefrontOutlined />,

        permission: "branch.read",

        roles: ORGANIZATION_ADMIN_ROLES,
      },

      {
        label: "Users",

        path: "/admin/users",

        icon: <AdminPanelSettingsOutlined />,

        permission: "user.read",

        roles: USER_ADMIN_ROLES,
      },

      {
        label: "Products",

        path: "/admin/products",

        icon: <StorefrontOutlined />,

        permission: "product.read",

        roles: PRODUCT_ADMIN_ROLES,
      },
    ],
  },
];

// ============================================================================
// EXPORTED ROLE GROUPS
// ============================================================================

export const navigationRoleGroups = {
  organizationAdmin: ORGANIZATION_ADMIN_ROLES,

  userAdmin: USER_ADMIN_ROLES,

  productAdmin: PRODUCT_ADMIN_ROLES,

  ai: AI_ROLES,

  reports: REPORT_ROLES,
};
