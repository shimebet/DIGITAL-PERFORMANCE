import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import argon2 from 'argon2';
import 'dotenv/config';

// ============================================================================
// ENVIRONMENT
// ============================================================================

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Missing environment variable: ${name}`,
    );
  }

  return value;
}

// ============================================================================
// PRISMA ADAPTER
// ============================================================================

const adapter = new PrismaMariaDb({
  host: requiredEnv('DATABASE_HOST'),

  port: Number(
    process.env.DATABASE_PORT ?? 3306,
  ),

  user: requiredEnv('DATABASE_USER'),

  password: requiredEnv(
    'DATABASE_PASSWORD',
  ),

  database: requiredEnv('DATABASE_NAME'),

  connectionLimit: 5,
});

const prisma = new PrismaClient({
  adapter,
});

// ============================================================================
// MAIN SEED
// ============================================================================

async function main() {
  console.log(
    'Starting database seed...',
  );

  // ==========================================================================
  // 1. ROLES
  // ==========================================================================

  const roles = [
    {
      code: 'SUPER_ADMIN',
      name: 'Super Administrator',
      description:
        'Full system access across all regions, districts, branches and modules.',
      isSystemRole: true,
    },

    {
      code: 'SYSTEM_ADMIN',
      name: 'System Administrator',
      description:
        'System configuration, user management and administration access.',
      isSystemRole: true,
    },

    {
      code: 'REGIONAL_MANAGER',
      name: 'Regional Manager',
      description:
        'Regional-level digital performance management access.',
      isSystemRole: true,
    },

    {
      code: 'REGIONAL_ANALYST',
      name: 'Regional Analyst',
      description:
        'Regional reporting, analytics and monitoring access.',
      isSystemRole: true,
    },

    {
      code: 'DISTRICT_MANAGER',
      name: 'District Manager',
      description:
        'District-level performance management access.',
      isSystemRole: true,
    },

    {
      code: 'DISTRICT_ANALYST',
      name: 'District Analyst',
      description:
        'District reporting, analytics and monitoring access.',
      isSystemRole: true,
    },

    {
      code: 'BRANCH_MANAGER',
      name: 'Branch Manager',
      description:
        'Branch-level management and performance monitoring access.',
      isSystemRole: true,
    },

    {
      code: 'DIGITAL_RESKILLED_STAFF',
      name: 'Digital Reskilled Staff',
      description:
        'Branch-level digital activity reporting and follow-up user.',
      isSystemRole: true,
    },

    {
      code: 'AUDITOR',
      name: 'Auditor',
      description:
        'Audit, compliance and read-only monitoring access.',
      isSystemRole: true,
    },

    {
      code: 'READ_ONLY',
      name: 'Read Only',
      description:
        'Read-only access to permitted system information.',
      isSystemRole: true,
    },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: {
        code: role.code,
      },

      update: {
        name: role.name,
        description: role.description,
        isSystemRole:
          role.isSystemRole,
      },

      create: role,
    });
  }

  console.log(
    `Seeded ${roles.length} roles.`,
  );

  // ==========================================================================
  // 2. PERMISSIONS
  // ==========================================================================

  const permissions = [
    // ------------------------------------------------------------------------
    // DASHBOARD
    // ------------------------------------------------------------------------

    {
      code: 'dashboard.read',
      module: 'dashboard',
      action: 'read',
      name: 'View dashboard',
      description:
        'View performance dashboard.',
    },

    // ------------------------------------------------------------------------
    // REGIONS
    // ------------------------------------------------------------------------

    {
      code: 'region.create',
      module: 'region',
      action: 'create',
      name: 'Create region',
      description:
        'Create new regions.',
    },

    {
      code: 'region.read',
      module: 'region',
      action: 'read',
      name: 'View regions',
      description:
        'View region information.',
    },

    {
      code: 'region.update',
      module: 'region',
      action: 'update',
      name: 'Update region',
      description:
        'Update region information.',
    },

    {
      code: 'region.delete',
      module: 'region',
      action: 'delete',
      name: 'Delete region',
      description:
        'Deactivate or delete regions.',
    },

    // ------------------------------------------------------------------------
    // DISTRICTS
    // ------------------------------------------------------------------------

    {
      code: 'district.create',
      module: 'district',
      action: 'create',
      name: 'Create district',
      description:
        'Create new districts.',
    },

    {
      code: 'district.read',
      module: 'district',
      action: 'read',
      name: 'View districts',
      description:
        'View district information.',
    },

    {
      code: 'district.update',
      module: 'district',
      action: 'update',
      name: 'Update district',
      description:
        'Update district information.',
    },

    {
      code: 'district.delete',
      module: 'district',
      action: 'delete',
      name: 'Delete district',
      description:
        'Deactivate or delete districts.',
    },

    // ------------------------------------------------------------------------
    // BRANCHES
    // ------------------------------------------------------------------------

    {
      code: 'branch.create',
      module: 'branch',
      action: 'create',
      name: 'Create branch',
      description:
        'Create new branches.',
    },

    {
      code: 'branch.read',
      module: 'branch',
      action: 'read',
      name: 'View branches',
      description:
        'View branch information.',
    },

    {
      code: 'branch.update',
      module: 'branch',
      action: 'update',
      name: 'Update branch',
      description:
        'Update branch information.',
    },

    {
      code: 'branch.delete',
      module: 'branch',
      action: 'delete',
      name: 'Delete branch',
      description:
        'Deactivate or delete branches.',
    },

    // ------------------------------------------------------------------------
    // USERS
    // ------------------------------------------------------------------------

    {
      code: 'user.create',
      module: 'user',
      action: 'create',
      name: 'Create user',
      description:
        'Create system users.',
    },

    {
      code: 'user.read',
      module: 'user',
      action: 'read',
      name: 'View users',
      description:
        'View system users.',
    },

    {
      code: 'user.update',
      module: 'user',
      action: 'update',
      name: 'Update user',
      description:
        'Update user information.',
    },

    {
      code: 'user.delete',
      module: 'user',
      action: 'delete',
      name: 'Delete user',
      description:
        'Deactivate users.',
    },

    // ------------------------------------------------------------------------
    // ROLES / PERMISSIONS
    // ------------------------------------------------------------------------

    {
      code: 'role.create',
      module: 'role',
      action: 'create',
      name: 'Create role',
      description:
        'Create security roles.',
    },

    {
      code: 'role.read',
      module: 'role',
      action: 'read',
      name: 'View roles',
      description:
        'View roles.',
    },

    {
      code: 'role.update',
      module: 'role',
      action: 'update',
      name: 'Update role',
      description:
        'Update roles.',
    },

    {
      code: 'permission.read',
      module: 'permission',
      action: 'read',
      name: 'View permissions',
      description:
        'View system permissions.',
    },

    {
      code: 'permission.assign',
      module: 'permission',
      action: 'assign',
      name: 'Assign permissions',
      description:
        'Assign permissions to roles.',
    },

    // ------------------------------------------------------------------------
    // PRODUCTS
    // ------------------------------------------------------------------------

    {
      code: 'product.create',
      module: 'product',
      action: 'create',
      name: 'Create product',
      description:
        'Create digital products or channels.',
    },

    {
      code: 'product.read',
      module: 'product',
      action: 'read',
      name: 'View products',
      description:
        'View digital products or channels.',
    },

    {
      code: 'product.update',
      module: 'product',
      action: 'update',
      name: 'Update product',
      description:
        'Update digital products or channels.',
    },

    // ------------------------------------------------------------------------
    // TARGETS
    // ------------------------------------------------------------------------

    {
      code: 'target.create',
      module: 'target',
      action: 'create',
      name: 'Create target',
      description:
        'Create performance targets.',
    },

    {
      code: 'target.read',
      module: 'target',
      action: 'read',
      name: 'View targets',
      description:
        'View performance targets.',
    },

    {
      code: 'target.update',
      module: 'target',
      action: 'update',
      name: 'Update target',
      description:
        'Update performance targets.',
    },

    {
      code: 'target.delete',
      module: 'target',
      action: 'delete',
      name: 'Delete target',
      description:
        'Deactivate performance targets.',
    },

    // ------------------------------------------------------------------------
    // ACTIVITIES
    // ------------------------------------------------------------------------

    {
      code: 'activity.create',
      module: 'activity',
      action: 'create',
      name: 'Create activity',
      description:
        'Create daily digital activities.',
    },

    {
      code: 'activity.read',
      module: 'activity',
      action: 'read',
      name: 'View activities',
      description:
        'View daily digital activities.',
    },

    {
      code: 'activity.update',
      module: 'activity',
      action: 'update',
      name: 'Update activity',
      description:
        'Update daily digital activities.',
    },

    {
      code: 'activity.delete',
      module: 'activity',
      action: 'delete',
      name: 'Delete activity',
      description:
        'Delete permitted activities.',
    },

    {
      code: 'activity.submit',
      module: 'activity',
      action: 'submit',
      name: 'Submit activity',
      description:
        'Submit daily activity reports.',
    },

    // ------------------------------------------------------------------------
    // DAILY SUBMISSIONS
    // ------------------------------------------------------------------------

    {
      code: 'submission.read',
      module: 'submission',
      action: 'read',
      name: 'View submissions',
      description:
        'View daily submissions.',
    },

    {
      code: 'submission.submit',
      module: 'submission',
      action: 'submit',
      name: 'Submit daily report',
      description:
        'Submit daily activity reports.',
    },

    {
      code: 'submission.review',
      module: 'submission',
      action: 'review',
      name: 'Review submission',
      description:
        'Review staff submissions.',
    },

    {
      code: 'submission.approve',
      module: 'submission',
      action: 'approve',
      name: 'Approve submission',
      description:
        'Approve submitted reports.',
    },

    // ------------------------------------------------------------------------
    // FOLLOW-UP
    // ------------------------------------------------------------------------

    {
      code: 'followup.create',
      module: 'followup',
      action: 'create',
      name: 'Create follow-up',
      description:
        'Create customer follow-ups.',
    },

    {
      code: 'followup.read',
      module: 'followup',
      action: 'read',
      name: 'View follow-ups',
      description:
        'View customer follow-ups.',
    },

    {
      code: 'followup.update',
      module: 'followup',
      action: 'update',
      name: 'Update follow-up',
      description:
        'Update customer follow-ups.',
    },

    // ------------------------------------------------------------------------
    // REPORTS
    // ------------------------------------------------------------------------

    {
      code: 'report.read',
      module: 'report',
      action: 'read',
      name: 'View reports',
      description:
        'View performance reports.',
    },

    {
      code: 'report.export',
      module: 'report',
      action: 'export',
      name: 'Export reports',
      description:
        'Export reports to supported formats.',
    },

    // ------------------------------------------------------------------------
    // ALERTS
    // ------------------------------------------------------------------------

    {
      code: 'alert.read',
      module: 'alert',
      action: 'read',
      name: 'View alerts',
      description:
        'View system and performance alerts.',
    },

    {
      code: 'alert.update',
      module: 'alert',
      action: 'update',
      name: 'Manage alerts',
      description:
        'Acknowledge or resolve alerts.',
    },

    // ------------------------------------------------------------------------
    // AI
    // ------------------------------------------------------------------------

    {
      code: 'ai.read',
      module: 'ai',
      action: 'read',
      name: 'View AI insights',
      description:
        'View AI-generated insights and recommendations.',
    },

    {
      code: 'ai.manage',
      module: 'ai',
      action: 'manage',
      name: 'Manage AI insights',
      description:
        'Manage AI insights and recommendations.',
    },

    // ------------------------------------------------------------------------
    // AUDIT
    // ------------------------------------------------------------------------

    {
      code: 'audit.read',
      module: 'audit',
      action: 'read',
      name: 'View audit logs',
      description:
        'View audit trail information.',
    },

    // ------------------------------------------------------------------------
    // SYSTEM SETTINGS
    // ------------------------------------------------------------------------

    {
      code: 'settings.read',
      module: 'settings',
      action: 'read',
      name: 'View settings',
      description:
        'View system settings.',
    },

    {
      code: 'settings.update',
      module: 'settings',
      action: 'update',
      name: 'Update settings',
      description:
        'Update system configuration.',
    },
  ];

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: {
        code: permission.code,
      },

      update: {
        module: permission.module,
        action: permission.action,
        name: permission.name,
        description:
          permission.description,
      },

      create: permission,
    });
  }

  console.log(
    `Seeded ${permissions.length} permissions.`,
  );
// ============================================================
// DEVELOPMENT USERS
// ============================================================

const developmentUsers = [
  {
    username: 'superadmin',
    password: 'SuperAdmin@123',
    firstName: 'Super',
    lastName: 'Administrator',
    roleCode: 'SUPER_ADMIN',
  },
  {
    username: 'sysadmin',
    password: 'SysAdmin@123',
    firstName: 'System',
    lastName: 'Administrator',
    roleCode: 'SYSTEM_ADMIN',
  },
  {
    username: 'regional.manager',
    password: 'Regional@123',
    firstName: 'Regional',
    lastName: 'Manager',
    roleCode: 'REGIONAL_MANAGER',
  },
  {
    username: 'regional.analyst',
    password: 'RegionalA@123',
    firstName: 'Regional',
    lastName: 'Analyst',
    roleCode: 'REGIONAL_ANALYST',
  },
  {
    username: 'district.manager',
    password: 'District@123',
    firstName: 'District',
    lastName: 'Manager',
    roleCode: 'DISTRICT_MANAGER',
  },
  {
    username: 'district.analyst',
    password: 'DistrictA@123',
    firstName: 'District',
    lastName: 'Analyst',
    roleCode: 'DISTRICT_ANALYST',
  },
  {
    username: 'branch.manager',
    password: 'Branch@123',
    firstName: 'Branch',
    lastName: 'Manager',
    roleCode: 'BRANCH_MANAGER',
  },
  {
    username: 'digital.staff',
    password: 'Digital@123',
    firstName: 'Digital',
    lastName: 'Staff',
    roleCode: 'DIGITAL_RESKILLED_STAFF',
  },
  {
    username: 'auditor',
    password: 'Auditor@123',
    firstName: 'System',
    lastName: 'Auditor',
    roleCode: 'AUDITOR',
  },
  {
    username: 'readonly',
    password: 'ReadOnly@123',
    firstName: 'Read',
    lastName: 'Only',
    roleCode: 'READ_ONLY',
  },
];

for (const item of developmentUsers) {
  const passwordHash =
    await argon2.hash(
      item.password,
    );

  const user =
    await prisma.user.upsert({
      where: {
        username: item.username,
      },

      update: {
        firstName:
          item.firstName,

        lastName:
          item.lastName,

        passwordHash,

        status:
          'ACTIVE',

        mustChangePassword:
          false,
      },

      create: {
        username:
          item.username,

        firstName:
          item.firstName,

        lastName:
          item.lastName,

        passwordHash,

        status:
          'ACTIVE',

        mustChangePassword:
          false,
      },
    });

  const role =
    await prisma.role.findUnique({
      where: {
        code:
          item.roleCode,
      },
    });

  if (!role) {
    throw new Error(
      `Role not found: ${item.roleCode}`,
    );
  }

  const existingRole =
    await prisma.userRole.findFirst({
      where: {
        userId:
          user.id,

        roleId:
          role.id,

        scopeType:
          'GLOBAL',

        regionId:
          null,

        districtId:
          null,

        branchId:
          null,
      },
    });

  if (!existingRole) {
    await prisma.userRole.create({
      data: {
        userId:
          user.id,

        roleId:
          role.id,

        scopeType:
          'GLOBAL',
      },
    });
  }
}

console.log(
  `Seeded ${developmentUsers.length} development users.`,
);
  // ==========================================================================
  // 3. SUPER ADMIN PERMISSIONS
  // ==========================================================================

  const superAdminRole =
    await prisma.role.findUniqueOrThrow({
      where: {
        code: 'SUPER_ADMIN',
      },
    });

  const allPermissions =
    await prisma.permission.findMany();

  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId:
            superAdminRole.id,

          permissionId:
            permission.id,
        },
      },

      update: {},

      create: {
        roleId:
          superAdminRole.id,

        permissionId:
          permission.id,
      },
    });
  }

  console.log(
    `Assigned ${allPermissions.length} permissions to SUPER_ADMIN.`,
  );

  // ==========================================================================
  // 4. SYSTEM ADMIN PERMISSIONS
  // ==========================================================================

  const systemAdminRole =
    await prisma.role.findUniqueOrThrow({
      where: {
        code: 'SYSTEM_ADMIN',
      },
    });

  const systemAdminPermissionCodes = [
    'dashboard.read',

    'region.read',

    'district.read',

    'branch.read',

    'user.create',
    'user.read',
    'user.update',
    'user.delete',

    'role.read',
    'role.update',

    'permission.read',
    'permission.assign',

    'product.create',
    'product.read',
    'product.update',

    'report.read',
    'report.export',

    'audit.read',

    'settings.read',
    'settings.update',
  ];

  const systemAdminPermissions =
    await prisma.permission.findMany({
      where: {
        code: {
          in: systemAdminPermissionCodes,
        },
      },
    });

  for (
    const permission of systemAdminPermissions
  ) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId:
            systemAdminRole.id,

          permissionId:
            permission.id,
        },
      },

      update: {},

      create: {
        roleId:
          systemAdminRole.id,

        permissionId:
          permission.id,
      },
    });
  }

  console.log(
    `Assigned ${systemAdminPermissions.length} permissions to SYSTEM_ADMIN.`,
  );

  // ==========================================================================
  // 5. DIGITAL PRODUCTS / CHANNELS
  // ==========================================================================

  const products = [
    {
      code: 'CBE_BIRR',
      name: 'CBE Birr',
      category: 'MOBILE_MONEY',
      displayOrder: 1,
    },

    {
      code: 'MOBILE_BANKING',
      name: 'Mobile Banking',
      category: 'DIGITAL_BANKING',
      displayOrder: 2,
    },

    {
      code: 'INTERNET_BANKING',
      name: 'Internet Banking',
      category: 'DIGITAL_BANKING',
      displayOrder: 3,
    },

    {
      code: 'CARD',
      name: 'Card',
      category: 'CARD',
      displayOrder: 4,
    },

    {
      code: 'MERCHANT',
      name: 'Merchant',
      category: 'MERCHANT',
      displayOrder: 5,
    },

    {
      code: 'POS',
      name: 'POS',
      category: 'MERCHANT',
      displayOrder: 6,
    },

    {
      code: 'QR',
      name: 'QR',
      category: 'MERCHANT',
      displayOrder: 7,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: {
        code: product.code,
      },

      update: {
        name: product.name,
        category: product.category,
        displayOrder:
          product.displayOrder,
      },

      create: product,
    });
  }

  console.log(
    `Seeded ${products.length} products.`,
  );

  // ==========================================================================
  // 6. INITIAL SUPER ADMIN USER
  // ==========================================================================

  const initialAdminPassword =
    process.env.INITIAL_ADMIN_PASSWORD ??
    'ChangeMe123!';

  const adminPasswordHash =
    await argon2.hash(
      initialAdminPassword,
    );

  const adminUser =
    await prisma.user.upsert({
      where: {
        username: 'admin',
      },

      update: {
        email:
          'admin@example.local',

        firstName:
          'System',

        lastName:
          'Administrator',

        status:
          'ACTIVE',
      },

      create: {
        username:
          'admin',

        email:
          'admin@example.local',

        passwordHash:
          adminPasswordHash,

        firstName:
          'System',

        lastName:
          'Administrator',

        status:
          'ACTIVE',

        mustChangePassword:
          true,

        mfaEnabled:
          false,
      },
    });

  console.log(
    'Initial administrator user created/verified.',
  );

  // ==========================================================================
  // 7. ASSIGN SUPER_ADMIN ROLE TO INITIAL ADMIN
  // ==========================================================================

  const existingAdminRole =
    await prisma.userRole.findFirst({
      where: {
        userId:
          adminUser.id,

        roleId:
          superAdminRole.id,

        scopeType:
          'GLOBAL',
      },
    });

  if (!existingAdminRole) {
    await prisma.userRole.create({
      data: {
        userId:
          adminUser.id,

        roleId:
          superAdminRole.id,

        scopeType:
          'GLOBAL',
      },
    });
  }

  console.log(
    'Assigned SUPER_ADMIN role to administrator.',
  );

  // ==========================================================================
  // 8. SYSTEM SETTINGS
  // ==========================================================================

  const systemSettings = [
    {
      key: 'APP_NAME',

      value:
        'Digital Performance Monitoring Platform',

      category:
        'GENERAL',

      description:
        'Application display name.',

      isPublic:
        true,
    },

    {
      key: 'DEFAULT_TIMEZONE',

      value:
        'Africa/Addis_Ababa',

      category:
        'GENERAL',

      description:
        'Default application timezone.',

      isPublic:
        true,
    },

    {
      key: 'FAILED_LOGIN_LIMIT',

      value:
        5,

      category:
        'SECURITY',

      description:
        'Maximum failed login attempts before temporary account lock.',

      isPublic:
        false,
    },

    {
      key: 'ACCOUNT_LOCK_MINUTES',

      value:
        15,

      category:
        'SECURITY',

      description:
        'Account lock duration after repeated failed authentication attempts.',

      isPublic:
        false,
    },

    {
      key: 'DAILY_SUBMISSION_REQUIRED',

      value:
        true,

      category:
        'PERFORMANCE',

      description:
        'Whether Digital Reskilled Staff must submit daily activity reports.',

      isPublic:
        false,
    },
  ];

  for (const setting of systemSettings) {
    await prisma.systemSetting.upsert({
      where: {
        key: setting.key,
      },

      update: {
        value:
          setting.value,

        category:
          setting.category,

        description:
          setting.description,

        isPublic:
          setting.isPublic,
      },

      create: {
        key:
          setting.key,

        value:
          setting.value,

        category:
          setting.category,

        description:
          setting.description,

        isPublic:
          setting.isPublic,
      },
    });
  }

  console.log(
    `Seeded ${systemSettings.length} system settings.`,
  );

  // ==========================================================================
  // COMPLETE
  // ==========================================================================

  console.log('');
  console.log(
    '==========================================',
  );

  console.log(
    'Database seed completed successfully.',
  );

  console.log(
    '==========================================',
  );

  console.log(
    `Roles: ${roles.length}`,
  );

  console.log(
    `Permissions: ${permissions.length}`,
  );

  console.log(
    `Products: ${products.length}`,
  );

  console.log(
    `System settings: ${systemSettings.length}`,
  );

  console.log(
    'Initial username: admin',
  );

  console.log(
    'Initial password must be changed after first login.',
  );

  console.log(
    '==========================================',
  );
}

// ============================================================================
// EXECUTE
// ============================================================================

main()
  .catch((error) => {
    console.error(
      'Database seed failed:',
    );

    console.error(error);

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });