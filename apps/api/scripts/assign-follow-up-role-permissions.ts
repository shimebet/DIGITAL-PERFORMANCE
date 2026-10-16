import 'dotenv/config';

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const MANAGE = 'followup.manage';
const DELETE = 'followup.delete';

const approved: Record<string, string[]> = {
  SUPER_ADMIN: [MANAGE, DELETE],
  SYSTEM_ADMIN: [MANAGE, DELETE],
  REGIONAL_MANAGER: [MANAGE],
  DISTRICT_MANAGER: [MANAGE],
  BRANCH_MANAGER: [MANAGE],
};

const permissionCodes = [MANAGE, DELETE];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is missing');
  }

  const url = new URL(databaseUrl);

  const adapter = new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
  });

  const prisma = new PrismaClient({ adapter });

  try {
    const roles = await prisma.role.findMany({
      where: {
        code: {
          in: Object.keys(approved),
        },
      },
      select: {
        id: true,
        code: true,
        status: true,
      },
    });

    const permissions = await prisma.permission.findMany({
      where: {
        code: {
          in: permissionCodes,
        },
      },
      select: {
        id: true,
        code: true,
        status: true,
      },
    });

    for (const roleCode of Object.keys(approved)) {
      const role = roles.find((item) => item.code === roleCode);

      if (!role || role.status !== 'ACTIVE') {
        throw new Error(`Required active role missing: ${roleCode}`);
      }
    }

    for (const permissionCode of permissionCodes) {
      const permission = permissions.find(
        (item) => item.code === permissionCode,
      );

      if (!permission || permission.status !== 'ACTIVE') {
        throw new Error(
          `Required active permission missing: ${permissionCode}`,
        );
      }
    }

    const existing = await prisma.rolePermission.findMany({
      where: {
        permission: {
          code: {
            in: permissionCodes,
          },
        },
      },
      select: {
        id: true,
        roleId: true,
        permissionId: true,
        role: {
          select: {
            code: true,
          },
        },
        permission: {
          select: {
            code: true,
          },
        },
      },
    });

    const backupDirectory = join(
      process.cwd(),
      'backups',
      'permissions',
    );

    await mkdir(backupDirectory, { recursive: true });

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-');

    const backupPath = join(
      backupDirectory,
      `follow-up-role-permissions-${timestamp}.json`,
    );

    await writeFile(
      backupPath,
      JSON.stringify(
        {
          createdAt: new Date().toISOString(),
          permissions: permissionCodes,
          assignments: existing,
        },
        null,
        2,
      ),
      { encoding: 'utf8', flag: 'wx' },
    );

    console.log('\nBackup created:');
    console.log(backupPath);

    const roleByCode = new Map(
      roles.map((role) => [role.code, role]),
    );

    const permissionByCode = new Map(
      permissions.map((permission) => [
        permission.code,
        permission,
      ]),
    );

    const approvedPairs = new Set(
      Object.entries(approved).flatMap(
        ([roleCode, codes]) =>
          codes.map((code) => `${roleCode}:${code}`),
      ),
    );

    const unauthorized = existing.filter(
      (item) =>
        !approvedPairs.has(
          `${item.role.code}:${item.permission.code}`,
        ),
    );

    console.log('\nApproved role-permission assignments:');

    console.table(
      Object.entries(approved).flatMap(
        ([role, codes]) =>
          codes.map((permission) => ({
            role,
            permission,
          })),
      ),
    );

    console.log(
      `Existing unauthorized lifecycle assignments: ${unauthorized.length}`,
    );

    await prisma.$transaction(async (tx) => {
      for (const [roleCode, codes] of Object.entries(approved)) {
        const role = roleByCode.get(roleCode);

        if (!role) {
          throw new Error(`Role missing: ${roleCode}`);
        }

        for (const permissionCode of codes) {
          const permission = permissionByCode.get(permissionCode);

          if (!permission) {
            throw new Error(
              `Permission missing: ${permissionCode}`,
            );
          }

          await tx.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: role.id,
                permissionId: permission.id,
              },
            },
            update: {},
            create: {
              roleId: role.id,
              permissionId: permission.id,
            },
          });
        }
      }

      if (unauthorized.length > 0) {
        await tx.rolePermission.deleteMany({
          where: {
            id: {
              in: unauthorized.map((item) => item.id),
            },
            permissionId: {
              in: permissions.map((item) => item.id),
            },
          },
        });
      }

      const finalAssignments = await tx.rolePermission.findMany({
        where: {
          permissionId: {
            in: permissions.map((item) => item.id),
          },
        },
        select: {
          role: {
            select: {
              code: true,
            },
          },
          permission: {
            select: {
              code: true,
            },
          },
        },
      });

      const actualPairs = new Set(
        finalAssignments.map(
          (item) =>
            `${item.role.code}:${item.permission.code}`,
        ),
      );

      if (
        actualPairs.size !== approvedPairs.size ||
        [...approvedPairs].some(
          (pair) => !actualPairs.has(pair),
        )
      ) {
        throw new Error(
          'Permission verification failed. Transaction rolled back.',
        );
      }
    });

    console.log('\nPermission assignments verified successfully.');
    console.log('All other permissions remain unchanged.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});