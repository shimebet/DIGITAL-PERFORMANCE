import 'dotenv/config';

import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

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
      select: {
        code: true,
        name: true,
        status: true,
        isSystemRole: true,
        rolePermissions: {
          where: {
            permission: {
              code: {
                in: ['followup.manage', 'followup.delete'],
              },
            },
          },
          select: {
            permission: {
              select: {
                code: true,
              },
            },
          },
        },
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
      orderBy: {
        code: 'asc',
      },
    });

    console.log('\nROLES AND LIFECYCLE PERMISSIONS');

    console.table(
      roles.map((role) => ({
        code: role.code,
        name: role.name,
        status: role.status,
        systemRole: role.isSystemRole,
        userAssignments: role._count.userRoles,
        manage: role.rolePermissions.some(
          (item) => item.permission.code === 'followup.manage',
        ),
        delete: role.rolePermissions.some(
          (item) => item.permission.code === 'followup.delete',
        ),
      })),
    );

    const permissions = await prisma.permission.findMany({
      where: {
        code: {
          in: ['followup.manage', 'followup.delete'],
        },
      },
      select: {
        code: true,
        status: true,
        name: true,
      },
      orderBy: {
        code: 'asc',
      },
    });

    console.log('\nREGISTERED LIFECYCLE PERMISSIONS');
    console.table(permissions);

    console.log('\nRead-only inspection completed.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});