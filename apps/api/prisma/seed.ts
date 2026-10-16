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
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

// ============================================================================
// PRISMA ADAPTER
// ============================================================================

const adapter = new PrismaMariaDb({
  host: requiredEnv('DATABASE_HOST'),

  port: Number(process.env.DATABASE_PORT ?? 3306),

  user: requiredEnv('DATABASE_USER'),

  password: requiredEnv('DATABASE_PASSWORD'),

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
  console.log('Starting database seed...');

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
      description: 'Regional-level digital performance management access.',
      isSystemRole: true,
    },

    {
      code: 'REGIONAL_ANALYST',
      name: 'Regional Analyst',
      description: 'Regional reporting, analytics and monitoring access.',
      isSystemRole: true,
    },

    {
      code: 'DISTRICT_MANAGER',
      name: 'District Manager',
      description: 'District-level performance management access.',
      isSystemRole: true,
    },

    {
      code: 'DISTRICT_ANALYST',
      name: 'District Analyst',
      description: 'District reporting, analytics and monitoring access.',
      isSystemRole: true,
    },

    {
      code: 'BRANCH_MANAGER',
      name: 'Branch Manager',
      description: 'Branch-level management and performance monitoring access.',
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
      description: 'Audit, compliance and read-only monitoring access.',
      isSystemRole: true,
    },

    {
      code: 'READ_ONLY',
      name: 'Read Only',
      description: 'Read-only access to permitted system information.',
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
        isSystemRole: role.isSystemRole,
      },

      create: role,
    });
  }

  console.log(`Seeded ${roles.length} roles.`);

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
      description: 'View performance dashboard.',
    },

    // ------------------------------------------------------------------------
    // REGIONS
    // ------------------------------------------------------------------------

    {
      code: 'region.create',
      module: 'region',
      action: 'create',
      name: 'Create region',
      description: 'Create new regions.',
    },

    {
      code: 'region.read',
      module: 'region',
      action: 'read',
      name: 'View regions',
      description: 'View region information.',
    },

    {
      code: 'region.update',
      module: 'region',
      action: 'update',
      name: 'Update region',
      description: 'Update region information.',
    },

    {
      code: 'region.delete',
      module: 'region',
      action: 'delete',
      name: 'Delete region',
      description: 'Deactivate or delete regions.',
    },

    // ------------------------------------------------------------------------
    // DISTRICTS
    // ------------------------------------------------------------------------

    {
      code: 'district.create',
      module: 'district',
      action: 'create',
      name: 'Create district',
      description: 'Create new districts.',
    },

    {
      code: 'district.read',
      module: 'district',
      action: 'read',
      name: 'View districts',
      description: 'View district information.',
    },

    {
      code: 'district.update',
      module: 'district',
      action: 'update',
      name: 'Update district',
      description: 'Update district information.',
    },

    {
      code: 'district.delete',
      module: 'district',
      action: 'delete',
      name: 'Delete district',
      description: 'Deactivate or delete districts.',
    },

    // ------------------------------------------------------------------------
    // BRANCHES
    // ------------------------------------------------------------------------

    {
      code: 'branch.create',
      module: 'branch',
      action: 'create',
      name: 'Create branch',
      description: 'Create new branches.',
    },

    {
      code: 'branch.read',
      module: 'branch',
      action: 'read',
      name: 'View branches',
      description: 'View branch information.',
    },

    {
      code: 'branch.update',
      module: 'branch',
      action: 'update',
      name: 'Update branch',
      description: 'Update branch information.',
    },

    {
      code: 'branch.delete',
      module: 'branch',
      action: 'delete',
      name: 'Delete branch',
      description: 'Deactivate or delete branches.',
    },

    // ------------------------------------------------------------------------
    // USERS
    // ------------------------------------------------------------------------

    {
      code: 'user.create',
      module: 'user',
      action: 'create',
      name: 'Create user',
      description: 'Create system users.',
    },

    {
      code: 'user.read',
      module: 'user',
      action: 'read',
      name: 'View users',
      description: 'View system users.',
    },

    {
      code: 'user.update',
      module: 'user',
      action: 'update',
      name: 'Update user',
      description: 'Update user information.',
    },

    {
      code: 'user.delete',
      module: 'user',
      action: 'delete',
      name: 'Delete user',
      description: 'Deactivate users.',
    },

    // ------------------------------------------------------------------------
    // ROLES / PERMISSIONS
    // ------------------------------------------------------------------------

    {
      code: 'role.create',
      module: 'role',
      action: 'create',
      name: 'Create role',
      description: 'Create security roles.',
    },

    {
      code: 'role.read',
      module: 'role',
      action: 'read',
      name: 'View roles',
      description: 'View roles.',
    },

    {
      code: 'role.update',
      module: 'role',
      action: 'update',
      name: 'Update role',
      description: 'Update roles.',
    },

    {
      code: 'permission.read',
      module: 'permission',
      action: 'read',
      name: 'View permissions',
      description: 'View system permissions.',
    },

    {
      code: 'permission.assign',
      module: 'permission',
      action: 'assign',
      name: 'Assign permissions',
      description: 'Assign permissions to roles.',
    },

    // ------------------------------------------------------------------------
    // PRODUCTS
    // ------------------------------------------------------------------------

    {
      code: 'product.create',
      module: 'product',
      action: 'create',
      name: 'Create product',
      description: 'Create digital products or channels.',
    },

    {
      code: 'product.read',
      module: 'product',
      action: 'read',
      name: 'View products',
      description: 'View digital products or channels.',
    },

    {
      code: 'product.update',
      module: 'product',
      action: 'update',
      name: 'Update product',
      description: 'Update digital products or channels.',
    },

    // ------------------------------------------------------------------------
    // TARGETS
    // ------------------------------------------------------------------------

    {
      code: 'target.create',
      module: 'target',
      action: 'create',
      name: 'Create target',
      description: 'Create performance targets.',
    },

    {
      code: 'target.read',
      module: 'target',
      action: 'read',
      name: 'View targets',
      description: 'View performance targets.',
    },

    {
      code: 'target.update',
      module: 'target',
      action: 'update',
      name: 'Update target',
      description: 'Update performance targets.',
    },

    {
      code: 'target.delete',
      module: 'target',
      action: 'delete',
      name: 'Delete target',
      description: 'Deactivate performance targets.',
    },

    // ------------------------------------------------------------------------
    // ACTIVITIES
    // ------------------------------------------------------------------------

    {
      code: 'activity.create',
      module: 'activity',
      action: 'create',
      name: 'Create activity',
      description: 'Create daily digital activities.',
    },

    {
      code: 'activity.read',
      module: 'activity',
      action: 'read',
      name: 'View activities',
      description: 'View daily digital activities.',
    },

    {
      code: 'activity.update',
      module: 'activity',
      action: 'update',
      name: 'Update activity',
      description: 'Update daily digital activities.',
    },

    {
      code: 'activity.delete',
      module: 'activity',
      action: 'delete',
      name: 'Delete activity',
      description: 'Delete permitted activities.',
    },

    {
      code: 'activity.submit',
      module: 'activity',
      action: 'submit',
      name: 'Submit activity',
      description: 'Submit daily activity reports.',
    },

    // ------------------------------------------------------------------------
    // DAILY SUBMISSIONS
    // ------------------------------------------------------------------------

    {
      code: 'submission.read',
      module: 'submission',
      action: 'read',
      name: 'View submissions',
      description: 'View daily submissions.',
    },

    {
      code: 'submission.submit',
      module: 'submission',
      action: 'submit',
      name: 'Submit daily report',
      description: 'Submit daily activity reports.',
    },

    {
      code: 'submission.review',
      module: 'submission',
      action: 'review',
      name: 'Review submission',
      description: 'Review staff submissions.',
    },

    {
      code: 'submission.approve',
      module: 'submission',
      action: 'approve',
      name: 'Approve submission',
      description: 'Approve submitted reports.',
    },

    // ------------------------------------------------------------------------
    // FOLLOW-UP
    // ------------------------------------------------------------------------

    {
      code: 'followup.create',
      module: 'followup',
      action: 'create',
      name: 'Create follow-up',
      description: 'Create customer follow-ups.',
    },

    {
      code: 'followup.read',
      module: 'followup',
      action: 'read',
      name: 'View follow-ups',
      description: 'View customer follow-ups.',
    },

    {
      code: 'followup.update',
      module: 'followup',
      action: 'update',
      name: 'Update follow-up',
      description: 'Update customer follow-ups.',
    },
    {
      code: 'followup.manage',
      module: 'followup',
      action: 'manage',
      name: 'Manage follow-up availability',
      description: 'Enable or disable customer follow-ups.',
    },

    {
      code: 'followup.reassign',
      module: 'followup',
      action: 'reassign',
      name: 'Reassign follow-up',
      description: 'Transfer customer follow-ups between authorized employees.',
    },
    {
      code: 'followup.delete',
      module: 'followup',
      action: 'delete',
      name: 'Delete follow-up',
      description: 'Soft-delete customer follow-ups.',
    },

    // ------------------------------------------------------------------------
    // REPORTS
    // ------------------------------------------------------------------------

    {
      code: 'report.read',
      module: 'report',
      action: 'read',
      name: 'View reports',
      description: 'View performance reports.',
    },

    {
      code: 'report.export',
      module: 'report',
      action: 'export',
      name: 'Export reports',
      description: 'Export reports to supported formats.',
    },

    // ------------------------------------------------------------------------
    // ALERTS
    // ------------------------------------------------------------------------

    {
      code: 'alert.read',
      module: 'alert',
      action: 'read',
      name: 'View alerts',
      description: 'View system and performance alerts.',
    },

    {
      code: 'alert.update',
      module: 'alert',
      action: 'update',
      name: 'Manage alerts',
      description: 'Acknowledge or resolve alerts.',
    },

    // ------------------------------------------------------------------------
    // AI
    // ------------------------------------------------------------------------

    {
      code: 'ai.read',
      module: 'ai',
      action: 'read',
      name: 'View AI insights',
      description: 'View AI-generated insights and recommendations.',
    },

    {
      code: 'ai.manage',
      module: 'ai',
      action: 'manage',
      name: 'Manage AI insights',
      description: 'Manage AI insights and recommendations.',
    },

    // ------------------------------------------------------------------------
    // AUDIT
    // ------------------------------------------------------------------------

    {
      code: 'audit.read',
      module: 'audit',
      action: 'read',
      name: 'View audit logs',
      description: 'View audit trail information.',
    },

    // ------------------------------------------------------------------------
    // SYSTEM SETTINGS
    // ------------------------------------------------------------------------

    {
      code: 'settings.read',
      module: 'settings',
      action: 'read',
      name: 'View settings',
      description: 'View system settings.',
    },

    {
      code: 'settings.update',
      module: 'settings',
      action: 'update',
      name: 'Update settings',
      description: 'Update system configuration.',
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
        description: permission.description,
      },

      create: permission,
    });
  }

  console.log(`Seeded ${permissions.length} permissions.`);

  // ============================================================================
  // 3. DEVELOPMENT ORGANIZATIONAL HIERARCHY
  // ============================================================================

  console.log('Seeding development organizational hierarchy...');

  const centralRegion = await prisma.region.upsert({
    where: {
      code: 'CENTRAL',
    },

    update: {
      name: 'Central Region',
      description: 'Development and demonstration region.',
      status: 'ACTIVE',
      deletedAt: null,
    },

    create: {
      code: 'CENTRAL',
      name: 'Central Region',
      description: 'Development and demonstration region.',
      status: 'ACTIVE',
    },
  });

  const addisDistrict = await prisma.district.upsert({
    where: {
      code: 'ADDIS-DIST',
    },

    update: {
      regionId: centralRegion.id,

      name: 'Addis District',

      description: 'Development district for Addis branches.',

      status: 'ACTIVE',

      deletedAt: null,
    },

    create: {
      regionId: centralRegion.id,

      code: 'ADDIS-DIST',

      name: 'Addis District',

      description: 'Development district for Addis branches.',

      status: 'ACTIVE',
    },
  });

  const eastDistrict = await prisma.district.upsert({
    where: {
      code: 'EAST-DIST',
    },

    update: {
      regionId: centralRegion.id,

      name: 'East District',

      description: 'Development district for eastern branches.',

      status: 'ACTIVE',

      deletedAt: null,
    },

    create: {
      regionId: centralRegion.id,

      code: 'EAST-DIST',

      name: 'East District',

      description: 'Development district for eastern branches.',

      status: 'ACTIVE',
    },
  });

  const boleBranch = await prisma.branch.upsert({
    where: {
      code: 'BOLE-001',
    },

    update: {
      districtId: addisDistrict.id,

      name: 'Bole Branch',

      branchType: 'BRANCH',

      timezone: 'Africa/Addis_Ababa',

      status: 'ACTIVE',

      deletedAt: null,
    },

    create: {
      districtId: addisDistrict.id,

      code: 'BOLE-001',

      name: 'Bole Branch',

      branchType: 'BRANCH',

      timezone: 'Africa/Addis_Ababa',

      status: 'ACTIVE',
    },
  });

  const meskelBranch = await prisma.branch.upsert({
    where: {
      code: 'MESKEL-001',
    },

    update: {
      districtId: addisDistrict.id,

      name: 'Meskel Square Branch',

      branchType: 'BRANCH',

      timezone: 'Africa/Addis_Ababa',

      status: 'ACTIVE',

      deletedAt: null,
    },

    create: {
      districtId: addisDistrict.id,

      code: 'MESKEL-001',

      name: 'Meskel Square Branch',

      branchType: 'BRANCH',

      timezone: 'Africa/Addis_Ababa',

      status: 'ACTIVE',
    },
  });

  const adamaBranch = await prisma.branch.upsert({
    where: {
      code: 'ADAMA-001',
    },

    update: {
      districtId: eastDistrict.id,

      name: 'Adama Branch',

      branchType: 'BRANCH',

      timezone: 'Africa/Addis_Ababa',

      status: 'ACTIVE',

      deletedAt: null,
    },

    create: {
      districtId: eastDistrict.id,

      code: 'ADAMA-001',

      name: 'Adama Branch',

      branchType: 'BRANCH',

      timezone: 'Africa/Addis_Ababa',

      status: 'ACTIVE',
    },
  });

  const bishoftuBranch = await prisma.branch.upsert({
    where: {
      code: 'BISHOFTU-001',
    },

    update: {
      districtId: eastDistrict.id,

      name: 'Bishoftu Branch',

      branchType: 'BRANCH',

      timezone: 'Africa/Addis_Ababa',

      status: 'ACTIVE',

      deletedAt: null,
    },

    create: {
      districtId: eastDistrict.id,

      code: 'BISHOFTU-001',

      name: 'Bishoftu Branch',

      branchType: 'BRANCH',

      timezone: 'Africa/Addis_Ababa',

      status: 'ACTIVE',
    },
  });

  console.log('Development organizational hierarchy seeded.');

  // ============================================================
  // 4. DEVELOPMENT USERS AND SCOPES
  // ============================================================

  const developmentUsers = [
    {
      username: 'superadmin',
      password: 'SuperAdmin@123',
      firstName: 'Super',
      lastName: 'Administrator',
      roleCode: 'SUPER_ADMIN',
      scopeType: 'GLOBAL',
    },

    {
      username: 'sysadmin',
      password: 'SysAdmin@123',
      firstName: 'System',
      lastName: 'Administrator',
      roleCode: 'SYSTEM_ADMIN',
      scopeType: 'GLOBAL',
    },

    {
      username: 'regional.manager',
      password: 'Regional@123',
      firstName: 'Regional',
      lastName: 'Manager',
      roleCode: 'REGIONAL_MANAGER',
      scopeType: 'REGION',
    },

    {
      username: 'regional.analyst',
      password: 'RegionalA@123',
      firstName: 'Regional',
      lastName: 'Analyst',
      roleCode: 'REGIONAL_ANALYST',
      scopeType: 'REGION',
    },

    {
      username: 'district.manager',
      password: 'District@123',
      firstName: 'District',
      lastName: 'Manager',
      roleCode: 'DISTRICT_MANAGER',
      scopeType: 'DISTRICT',
    },

    {
      username: 'district.analyst',
      password: 'DistrictA@123',
      firstName: 'District',
      lastName: 'Analyst',
      roleCode: 'DISTRICT_ANALYST',
      scopeType: 'DISTRICT',
    },

    {
      username: 'branch.manager',
      password: 'Branch@123',
      firstName: 'Branch',
      lastName: 'Manager',
      roleCode: 'BRANCH_MANAGER',
      scopeType: 'BRANCH',
    },

    {
      username: 'digital.staff',
      password: 'Digital@123',
      firstName: 'Digital',
      lastName: 'Staff',
      roleCode: 'DIGITAL_RESKILLED_STAFF',
      scopeType: 'STAFF',
      employeeNumber: 'DRS-0001',
    },

    {
      username: 'digital.staff2',
      password: 'Digital2@123',
      firstName: 'Digital',
      lastName: 'Staff Two',
      roleCode: 'DIGITAL_RESKILLED_STAFF',
      scopeType: 'STAFF',
      employeeNumber: 'DRS-0002',
    },

    {
      username: 'auditor',
      password: 'Auditor@123',
      firstName: 'System',
      lastName: 'Auditor',
      roleCode: 'AUDITOR',
      scopeType: 'GLOBAL',
    },

    {
      username: 'readonly',
      password: 'ReadOnly@123',
      firstName: 'Read',
      lastName: 'Only',
      roleCode: 'READ_ONLY',
      scopeType: 'REGION',
    },
  ] as const;

  for (const item of developmentUsers) {
    const passwordHash = await argon2.hash(item.password);

    // ============================================================
    // CREATE / UPDATE USER
    // ============================================================

    const user = await prisma.user.upsert({
      where: {
        username: item.username,
      },

      update: {
        firstName: item.firstName,

        lastName: item.lastName,

        passwordHash,

        status: 'ACTIVE',

        mustChangePassword: false,

        deletedAt: null,
      },

      create: {
        username: item.username,

        firstName: item.firstName,

        lastName: item.lastName,

        passwordHash,

        status: 'ACTIVE',

        mustChangePassword: false,
      },
    });

    // ============================================================
    // FIND ROLE
    // ============================================================

    const role = await prisma.role.findUnique({
      where: {
        code: item.roleCode,
      },
    });

    if (!role) {
      throw new Error(`Role not found: ${item.roleCode}`);
    }

    // ============================================================
    // REMOVE OLD DEVELOPMENT ROLE ASSIGNMENT
    //
    // Important because previous seed assigned GLOBAL scope
    // to every development account.
    // ============================================================

    await prisma.userRole.deleteMany({
      where: {
        userId: user.id,

        roleId: role.id,
      },
    });

    // ============================================================
    // CREATE CORRECT SCOPE
    // ============================================================

    if (item.scopeType === 'GLOBAL') {
      await prisma.userRole.create({
        data: {
          userId: user.id,

          roleId: role.id,

          scopeType: 'GLOBAL',
        },
      });
    }

    if (item.scopeType === 'REGION') {
      await prisma.userRole.create({
        data: {
          userId: user.id,

          roleId: role.id,

          scopeType: 'REGION',

          regionId: centralRegion.id,
        },
      });
    }

    if (item.scopeType === 'DISTRICT') {
      await prisma.userRole.create({
        data: {
          userId: user.id,

          roleId: role.id,

          scopeType: 'DISTRICT',

          regionId: centralRegion.id,

          districtId: addisDistrict.id,
        },
      });
    }

    if (item.scopeType === 'BRANCH') {
      await prisma.userRole.create({
        data: {
          userId: user.id,

          roleId: role.id,

          scopeType: 'BRANCH',

          regionId: centralRegion.id,

          districtId: addisDistrict.id,

          branchId: boleBranch.id,
        },
      });
    }

    if (item.scopeType === 'STAFF') {
      // ============================================================
      // STAFF ROLE ASSIGNMENT
      // ============================================================

      await prisma.userRole.create({
        data: {
          userId: user.id,

          roleId: role.id,

          scopeType: 'STAFF',

          regionId: centralRegion.id,

          districtId: addisDistrict.id,

          branchId: boleBranch.id,
        },
      });

      // ============================================================
      // DIGITAL STAFF PROFILE
      //
      // Each staff member receives an independent employee number.
      // ============================================================

      await prisma.staffProfile.upsert({
        where: {
          userId: user.id,
        },

        update: {
          branchId: boleBranch.id,

          employeeNumber: item.employeeNumber,

          jobTitle: 'Digital Reskilled Staff',

          digitalReskilled: true,

          status: 'ACTIVE',
        },

        create: {
          userId: user.id,

          branchId: boleBranch.id,

          employeeNumber: item.employeeNumber,

          jobTitle: 'Digital Reskilled Staff',

          digitalReskilled: true,

          status: 'ACTIVE',
        },
      });
    }
  }

  console.log(
    `Seeded ${developmentUsers.length} development users with scoped access.`,
  );

  console.log(`Seeded ${developmentUsers.length} development users.`);
  // ==========================================================================
  // 5. ROLE-PERMISSION MATRIX
  // ==========================================================================
  //
  // Permissions define WHAT a role can do.
  // UserRole scope defines WHERE that role can do it.
  //
  // This section is intentionally deterministic: each seed run replaces the
  // complete permission set for every system role so database assignments stay
  // synchronized with this source file.
  // ==========================================================================

  const superAdminRole = await prisma.role.findUniqueOrThrow({
    where: {
      code: 'SUPER_ADMIN',
    },
  });

  async function assignPermissionsToRole(
    roleCode: string,
    permissionCodes: readonly string[],
  ) {
    const role = await prisma.role.findUniqueOrThrow({
      where: {
        code: roleCode,
      },
    });

    const uniquePermissionCodes = [...new Set(permissionCodes)];

    const resolvedPermissions = await prisma.permission.findMany({
      where: {
        code: {
          in: uniquePermissionCodes,
        },
      },

      select: {
        id: true,
        code: true,
      },
    });

    const foundCodes = new Set(
      resolvedPermissions.map((permission) => permission.code),
    );

    const missingCodes = uniquePermissionCodes.filter(
      (code) => !foundCodes.has(code),
    );

    if (missingCodes.length > 0) {
      throw new Error(
        `Missing permissions for ${roleCode}: ${missingCodes.join(', ')}`,
      );
    }

    await prisma.rolePermission.deleteMany({
      where: {
        roleId: role.id,
      },
    });

    if (resolvedPermissions.length > 0) {
      await prisma.rolePermission.createMany({
        data: resolvedPermissions.map((permission) => ({
          roleId: role.id,
          permissionId: permission.id,
        })),
      });
    }

    console.log(
      `Assigned ${resolvedPermissions.length} permissions to ${roleCode}.`,
    );
  }

  // --------------------------------------------------------------------------
  // SUPER ADMIN
  // --------------------------------------------------------------------------

  const allPermissionRecords = await prisma.permission.findMany({
    select: {
      code: true,
    },
  });

  const superAdminPermissionCodes = allPermissionRecords.map(
    (permission) => permission.code,
  );

  // --------------------------------------------------------------------------
  // SYSTEM ADMIN
  // --------------------------------------------------------------------------

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
  ] as const;

  // --------------------------------------------------------------------------
  // REGIONAL MANAGER
  // --------------------------------------------------------------------------

  const regionalManagerPermissionCodes = [
    'dashboard.read',

    'region.read',
    'district.read',
    'branch.read',

    'product.read',
    'target.read',

    'activity.read',

    'submission.read',
    'submission.review',
    'submission.approve',

    'followup.read',
    'followup.update',

    'report.read',
    'report.export',

    'alert.read',
    'alert.update',
    'ai.read',
  ] as const;

  // --------------------------------------------------------------------------
  // REGIONAL ANALYST
  // --------------------------------------------------------------------------

  const regionalAnalystPermissionCodes = [
    'dashboard.read',

    'region.read',
    'district.read',
    'branch.read',

    'product.read',
    'target.read',

    'activity.read',
    'submission.read',
    'followup.read',

    'report.read',
    'report.export',

    'alert.read',
    'ai.read',
  ] as const;

  // --------------------------------------------------------------------------
  // DISTRICT MANAGER
  // --------------------------------------------------------------------------

  const districtManagerPermissionCodes = [
    'dashboard.read',

    'region.read',
    'district.read',
    'branch.read',

    'product.read',
    'target.read',

    'activity.read',

    'submission.read',
    'submission.review',
    'submission.approve',

    'followup.read',
    'followup.update',

    'report.read',
    'report.export',

    'alert.read',
    'alert.update',
    'ai.read',
  ] as const;

  // --------------------------------------------------------------------------
  // DISTRICT ANALYST
  // --------------------------------------------------------------------------

  const districtAnalystPermissionCodes = [
    'dashboard.read',

    'region.read',
    'district.read',
    'branch.read',

    'product.read',
    'target.read',

    'activity.read',
    'submission.read',
    'followup.read',

    'report.read',
    'report.export',

    'alert.read',
    'ai.read',
  ] as const;

  // --------------------------------------------------------------------------
  // BRANCH MANAGER
  // --------------------------------------------------------------------------

  const branchManagerPermissionCodes = [
    'dashboard.read',

    'region.read',
    'district.read',
    'branch.read',

    'product.read',
    'target.read',

    'activity.read',

    'submission.read',
    'submission.review',
    'submission.approve',

    'followup.read',
    'followup.update',

    'report.read',
    'report.export',

    'alert.read',
    'alert.update',
    'ai.read',
  ] as const;

  // --------------------------------------------------------------------------
  // DIGITAL RESKILLED STAFF
  // --------------------------------------------------------------------------

  const digitalStaffPermissionCodes = [
    'dashboard.read',

    // Reference data used by operational forms.
    'region.read',
    'district.read',
    'branch.read',
    'product.read',
    'target.read',

    // Own operational activity workflow.
    'activity.create',
    'activity.read',
    'activity.update',

    // Own daily submission workflow.
    'submission.read',
    'submission.submit',

    // Customer follow-up workflow.
    'followup.create',
    'followup.read',
    'followup.update',

    'alert.read',
  ] as const;

  // --------------------------------------------------------------------------
  // AUDITOR
  // --------------------------------------------------------------------------

  const auditorPermissionCodes = [
    'dashboard.read',

    'region.read',
    'district.read',
    'branch.read',

    'user.read',
    'role.read',
    'permission.read',

    'product.read',
    'target.read',

    'activity.read',
    'submission.read',
    'followup.read',

    'report.read',
    'report.export',

    'alert.read',
    'ai.read',
    'audit.read',
    'settings.read',
  ] as const;

  // --------------------------------------------------------------------------
  // READ ONLY
  // --------------------------------------------------------------------------

  const readOnlyPermissionCodes = [
    'dashboard.read',

    'region.read',
    'district.read',
    'branch.read',

    'product.read',
    'target.read',

    'activity.read',
    'submission.read',
    'followup.read',

    'report.read',
    'alert.read',
    'ai.read',
  ] as const;

  // --------------------------------------------------------------------------
  // APPLY ROLE-PERMISSION MATRIX
  // --------------------------------------------------------------------------

  await assignPermissionsToRole('SUPER_ADMIN', superAdminPermissionCodes);

  await assignPermissionsToRole('SYSTEM_ADMIN', systemAdminPermissionCodes);

  await assignPermissionsToRole(
    'REGIONAL_MANAGER',
    regionalManagerPermissionCodes,
  );

  await assignPermissionsToRole(
    'REGIONAL_ANALYST',
    regionalAnalystPermissionCodes,
  );

  await assignPermissionsToRole(
    'DISTRICT_MANAGER',
    districtManagerPermissionCodes,
  );

  await assignPermissionsToRole(
    'DISTRICT_ANALYST',
    districtAnalystPermissionCodes,
  );

  await assignPermissionsToRole('BRANCH_MANAGER', branchManagerPermissionCodes);

  await assignPermissionsToRole(
    'DIGITAL_RESKILLED_STAFF',
    digitalStaffPermissionCodes,
  );

  await assignPermissionsToRole('AUDITOR', auditorPermissionCodes);

  await assignPermissionsToRole('READ_ONLY', readOnlyPermissionCodes);

  console.log('Role-permission matrix seeded successfully.');

  // ==========================================================================
  // 6. DIGITAL PRODUCTS / CHANNELS
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
        displayOrder: product.displayOrder,
      },

      create: product,
    });
  }

  console.log(`Seeded ${products.length} products.`);

  // ============================================================================
  // 7. DEVELOPMENT PERFORMANCE DATA
  // ============================================================================

  console.log('Seeding development performance data...');

  // --------------------------------------------------------------------------
  // REQUIRED USERS
  // --------------------------------------------------------------------------

  const digitalStaffUser = await prisma.user.findUniqueOrThrow({
    where: {
      username: 'digital.staff',
    },
  });

  const branchManagerUser = await prisma.user.findUniqueOrThrow({
    where: {
      username: 'branch.manager',
    },
  });

  // --------------------------------------------------------------------------
  // REQUIRED PRODUCTS
  // --------------------------------------------------------------------------

  const cbeBirrProduct = await prisma.product.findUniqueOrThrow({
    where: {
      code: 'CBE_BIRR',
    },
  });

  const mobileBankingProduct = await prisma.product.findUniqueOrThrow({
    where: {
      code: 'MOBILE_BANKING',
    },
  });

  const cardProduct = await prisma.product.findUniqueOrThrow({
    where: {
      code: 'CARD',
    },
  });

  // ============================================================================
  // TARGET
  // ============================================================================

  const targetStartDate = new Date('2026-10-01T00:00:00.000Z');

  const targetEndDate = new Date('2026-10-31T00:00:00.000Z');

  let activationTarget = await prisma.target.findFirst({
    where: {
      name: 'October 2026 Activation Target',

      metricType: 'ACTIVATION',

      periodType: 'MONTHLY',
    },
  });

  if (!activationTarget) {
    activationTarget = await prisma.target.create({
      data: {
        name: 'October 2026 Activation Target',

        description:
          'Development target for Bole Branch digital activation performance.',

        metricType: 'ACTIVATION',

        periodType: 'MONTHLY',

        startDate: targetStartDate,

        endDate: targetEndDate,

        defaultTargetValue: 500,

        status: 'ACTIVE',

        createdByUserId: branchManagerUser.id,
      },
    });
  } else {
    activationTarget = await prisma.target.update({
      where: {
        id: activationTarget.id,
      },

      data: {
        description:
          'Development target for Bole Branch digital activation performance.',

        startDate: targetStartDate,

        endDate: targetEndDate,

        defaultTargetValue: 500,

        status: 'ACTIVE',

        createdByUserId: branchManagerUser.id,

        deletedAt: null,
      },
    });
  }

  // Remove previous demo assignments so the seed stays repeatable.

  await prisma.targetAssignment.deleteMany({
    where: {
      targetId: activationTarget.id,
    },
  });

  await prisma.targetAssignment.create({
    data: {
      targetId: activationTarget.id,

      scopeType: 'BRANCH',

      regionId: centralRegion.id,

      districtId: addisDistrict.id,

      branchId: boleBranch.id,

      targetValue: 500,
    },
  });

  await prisma.targetAssignment.createMany({
    data: [
      {
        targetId: activationTarget.id,

        scopeType: 'BRANCH',

        regionId: centralRegion.id,

        districtId: addisDistrict.id,

        branchId: boleBranch.id,

        productId: cbeBirrProduct.id,

        targetValue: 220,
      },

      {
        targetId: activationTarget.id,

        scopeType: 'BRANCH',

        regionId: centralRegion.id,

        districtId: addisDistrict.id,

        branchId: boleBranch.id,

        productId: mobileBankingProduct.id,

        targetValue: 170,
      },

      {
        targetId: activationTarget.id,

        scopeType: 'BRANCH',

        regionId: centralRegion.id,

        districtId: addisDistrict.id,

        branchId: boleBranch.id,

        productId: cardProduct.id,

        targetValue: 110,
      },
    ],
  });

  console.log('Development activation target seeded.');

  // ============================================================================
  // CLEAN PREVIOUS DEMO OPERATIONAL DATA
  // ============================================================================

  // Follow-ups are removed first because some are connected to activities.

  await prisma.followUp.deleteMany({
    where: {
      customerReference: {
        startsWith: 'DEMO-',
      },
    },
  });

  // ActivityProduct rows cascade when activities are deleted.

  await prisma.activity.deleteMany({
    where: {
      staffId: digitalStaffUser.id,

      remarks: {
        startsWith: '[DEMO]',
      },
    },
  });

  // DailySubmission has a unique composite key, but deleting the demo dates
  // keeps this section simple and repeatable.

  await prisma.dailySubmission.deleteMany({
    where: {
      staffId: digitalStaffUser.id,

      branchId: boleBranch.id,

      submissionDate: {
        gte: new Date('2026-09-25T00:00:00.000Z'),

        lte: new Date('2026-10-02T00:00:00.000Z'),
      },
    },
  });

  // ============================================================================
  // DAILY DEMO VALUES
  // ============================================================================

  const demoDays = [
    {
      date: '2026-09-25',

      visits: 74,

      calls: 35,

      contacted: 89,

      educated: 71,

      activations: 26,

      reactivations: 5,

      transactions: 22,
    },

    {
      date: '2026-09-26',

      visits: 82,

      calls: 41,

      contacted: 96,

      educated: 77,

      activations: 30,

      reactivations: 4,

      transactions: 25,
    },

    {
      date: '2026-09-27',

      visits: 68,

      calls: 29,

      contacted: 78,

      educated: 63,

      activations: 22,

      reactivations: 6,

      transactions: 18,
    },

    {
      date: '2026-09-28',

      visits: 91,

      calls: 45,

      contacted: 108,

      educated: 86,

      activations: 35,

      reactivations: 7,

      transactions: 29,
    },

    {
      date: '2026-09-29',

      visits: 88,

      calls: 43,

      contacted: 102,

      educated: 82,

      activations: 33,

      reactivations: 5,

      transactions: 28,
    },

    {
      date: '2026-09-30',

      visits: 96,

      calls: 51,

      contacted: 116,

      educated: 94,

      activations: 39,

      reactivations: 8,

      transactions: 34,
    },

    {
      date: '2026-10-01',

      visits: 105,

      calls: 58,

      contacted: 128,

      educated: 101,

      activations: 44,

      reactivations: 9,

      transactions: 38,
    },

    {
      date: '2026-10-02',

      visits: 112,

      calls: 62,

      contacted: 136,

      educated: 109,

      activations: 48,

      reactivations: 10,

      transactions: 43,
    },
  ];

  // ============================================================================
  // SUBMISSIONS + ACTIVITIES + PRODUCT RESULTS
  // ============================================================================

  for (let index = 0; index < demoDays.length; index++) {
    const day = demoDays[index];

    const date = new Date(`${day.date}T00:00:00.000Z`);

    const submittedAt = new Date(`${day.date}T15:30:00.000Z`);

    const reviewedAt = new Date(`${day.date}T16:00:00.000Z`);

    const approvedAt = new Date(`${day.date}T16:15:00.000Z`);

    const submission = await prisma.dailySubmission.create({
      data: {
        staffId: digitalStaffUser.id,

        branchId: boleBranch.id,

        submissionDate: date,

        status: 'APPROVED',

        submittedAt,

        reviewedAt,

        approvedAt,

        approvedByUserId: branchManagerUser.id,

        remarks: '[DEMO] Daily development submission.',

        version: 1,
      },
    });

    const activity = await prisma.activity.create({
      data: {
        submissionId: submission.id,

        staffId: digitalStaffUser.id,

        branchId: boleBranch.id,

        activityDate: date,

        source: 'MOBILE',

        customerVisits: day.visits,

        phoneCalls: day.calls,

        customersContacted: day.contacted,

        customersEducated: day.educated,

        activations: day.activations,

        reactivations: day.reactivations,

        transactions: day.transactions,

        followUpsCreated: 3,

        remarks: `[DEMO] Digital performance activity ${day.date}.`,

        challenges:
          index % 3 === 0
            ? 'Some customers required additional onboarding support.'
            : null,
      },
    });

    // ------------------------------------------------------------------------
    // PRODUCT DISTRIBUTION
    // ------------------------------------------------------------------------

    const cbeActivations = Math.floor(day.activations * 0.45);

    const mobileActivations = Math.floor(day.activations * 0.35);

    const cardActivations =
      day.activations - cbeActivations - mobileActivations;

    const cbeTransactions = Math.floor(day.transactions * 0.5);

    const mobileTransactions = Math.floor(day.transactions * 0.3);

    const cardTransactions =
      day.transactions - cbeTransactions - mobileTransactions;

    await prisma.activityProduct.createMany({
      data: [
        {
          activityId: activity.id,

          productId: cbeBirrProduct.id,

          customersEngaged: Math.floor(day.educated * 0.45),

          activations: cbeActivations,

          reactivations: Math.floor(day.reactivations * 0.5),

          transactions: cbeTransactions,

          failedActivations: index % 3,

          remarks: '[DEMO] CBE Birr performance.',
        },

        {
          activityId: activity.id,

          productId: mobileBankingProduct.id,

          customersEngaged: Math.floor(day.educated * 0.35),

          activations: mobileActivations,

          reactivations: Math.floor(day.reactivations * 0.3),

          transactions: mobileTransactions,

          failedActivations: index % 2,

          remarks: '[DEMO] Mobile Banking performance.',
        },

        {
          activityId: activity.id,

          productId: cardProduct.id,

          customersEngaged: Math.floor(day.educated * 0.2),

          activations: cardActivations,

          reactivations:
            day.reactivations -
            Math.floor(day.reactivations * 0.5) -
            Math.floor(day.reactivations * 0.3),

          transactions: cardTransactions,

          failedActivations: 0,

          remarks: '[DEMO] Card performance.',
        },
      ],
    });

    // ========================================================================
    // FOLLOW-UP SAMPLE
    // ========================================================================

    if (index >= demoDays.length - 4) {
      const followUpStatus =
        index === demoDays.length - 1
          ? 'OPEN'
          : index === demoDays.length - 2
            ? 'CONTACTED'
            : index === demoDays.length - 3
              ? 'CONVERTED'
              : 'RESCHEDULED';

      await prisma.followUp.create({
        data: {
          activityId: activity.id,

          branchId: boleBranch.id,

          productId: cbeBirrProduct.id,

          createdByUserId: digitalStaffUser.id,

          assignedToUserId: digitalStaffUser.id,

          customerReference: `DEMO-${String(index + 1).padStart(4, '0')}`,

          customerNameMasked: `Customer ${String(index + 1).padStart(
            2,
            '0',
          )}****`,

          contactReference: `09******${String(index + 10).slice(-2)}`,

          reason:
            'Customer requires follow-up after digital product education.',

          priority: index === demoDays.length - 1 ? 'HIGH' : 'MEDIUM',

          status: followUpStatus,

          followUpDate: date,

          nextFollowUpDate:
            followUpStatus === 'OPEN' || followUpStatus === 'RESCHEDULED'
              ? new Date('2026-10-05T00:00:00.000Z')
              : null,

          completedAt: followUpStatus === 'CONVERTED' ? approvedAt : null,

          outcome:
            followUpStatus === 'CONVERTED'
              ? 'Customer successfully activated and completed a transaction.'
              : null,

          remarks: '[DEMO] Development follow-up.',
        },
      });
    }
  }

  console.log(
    `Seeded ${demoDays.length} development daily submissions and activities.`,
  );

  console.log('Development product performance and follow-up data seeded.');

  // ==========================================================================
  // 8. INITIAL SUPER ADMIN USER
  // ==========================================================================

  const initialAdminPassword =
    process.env.INITIAL_ADMIN_PASSWORD ?? 'ChangeMe123!';

  const adminPasswordHash = await argon2.hash(initialAdminPassword);

  const adminUser = await prisma.user.upsert({
    where: {
      username: 'admin',
    },

    update: {
      email: 'admin@example.local',

      firstName: 'System',

      lastName: 'Administrator',

      status: 'ACTIVE',
    },

    create: {
      username: 'admin',

      email: 'admin@example.local',

      passwordHash: adminPasswordHash,

      firstName: 'System',

      lastName: 'Administrator',

      status: 'ACTIVE',

      mustChangePassword: true,

      mfaEnabled: false,
    },
  });

  console.log('Initial administrator user created/verified.');

  // ==========================================================================
  // 9. ASSIGN SUPER_ADMIN ROLE TO INITIAL ADMIN
  // ==========================================================================

  const existingAdminRole = await prisma.userRole.findFirst({
    where: {
      userId: adminUser.id,

      roleId: superAdminRole.id,

      scopeType: 'GLOBAL',
    },
  });

  if (!existingAdminRole) {
    await prisma.userRole.create({
      data: {
        userId: adminUser.id,

        roleId: superAdminRole.id,

        scopeType: 'GLOBAL',
      },
    });
  }

  console.log('Assigned SUPER_ADMIN role to administrator.');

  // ==========================================================================
  // 10. SYSTEM SETTINGS
  // ==========================================================================

  const systemSettings = [
    {
      key: 'APP_NAME',

      value: 'Digital Performance Monitoring Platform',

      category: 'GENERAL',

      description: 'Application display name.',

      isPublic: true,
    },

    {
      key: 'DEFAULT_TIMEZONE',

      value: 'Africa/Addis_Ababa',

      category: 'GENERAL',

      description: 'Default application timezone.',

      isPublic: true,
    },

    {
      key: 'FAILED_LOGIN_LIMIT',

      value: 5,

      category: 'SECURITY',

      description:
        'Maximum failed login attempts before temporary account lock.',

      isPublic: false,
    },

    {
      key: 'ACCOUNT_LOCK_MINUTES',

      value: 15,

      category: 'SECURITY',

      description:
        'Account lock duration after repeated failed authentication attempts.',

      isPublic: false,
    },

    {
      key: 'DAILY_SUBMISSION_REQUIRED',

      value: true,

      category: 'PERFORMANCE',

      description:
        'Whether Digital Reskilled Staff must submit daily activity reports.',

      isPublic: false,
    },
  ];

  for (const setting of systemSettings) {
    await prisma.systemSetting.upsert({
      where: {
        key: setting.key,
      },

      update: {
        value: setting.value,

        category: setting.category,

        description: setting.description,

        isPublic: setting.isPublic,
      },

      create: {
        key: setting.key,

        value: setting.value,

        category: setting.category,

        description: setting.description,

        isPublic: setting.isPublic,
      },
    });
  }

  console.log(`Seeded ${systemSettings.length} system settings.`);

  // ==========================================================================
  // 11. COMPLETE
  // ==========================================================================

  console.log('');
  console.log('==========================================');

  console.log('Database seed completed successfully.');

  console.log('==========================================');

  console.log(`Roles: ${roles.length}`);

  console.log(`Permissions: ${permissions.length}`);

  console.log(`Products: ${products.length}`);

  console.log(`System settings: ${systemSettings.length}`);

  console.log('Initial username: admin');

  console.log('Initial password must be changed after first login.');

  console.log('==========================================');
}

// ============================================================================
// EXECUTE
// ============================================================================

main()
  .catch((error) => {
    console.error('Database seed failed:');

    console.error(error);

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
