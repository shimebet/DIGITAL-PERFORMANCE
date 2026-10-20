import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const url = new URL(process.env.DATABASE_URL ?? '');

if (!url.hostname || !url.pathname.slice(1)) {
  throw new Error('DATABASE_URL is incomplete');
}

const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: decodeURIComponent(url.pathname.slice(1)),
  connectionLimit: 2,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const database = await prisma.$queryRaw<
    Array<{ databaseName: string }>
  >`SELECT DATABASE() AS databaseName`;

  console.log('\n=== DATABASE ===');
  console.log({
    host: url.hostname,
    database: database[0]?.databaseName,
  });

  console.log('\n=== USER COUNTS ===');
  console.log(
    await prisma.user.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
  );

  console.log('\n=== EXISTING USERS ===');

  const users = await prisma.user.findMany({
    select: {
      username: true,
      status: true,
      deletedAt: true,
      roles: {
        select: {
          scopeType: true,
          role: {
            select: { code: true },
          },
        },
      },
    },
    orderBy: { username: 'asc' },
  });

  console.log(JSON.stringify(users, null, 2));

  console.log('\n=== ACTIVE ROLES AND PERMISSIONS ===');

  const roles = await prisma.role.findMany({
    where: { status: 'ACTIVE' },
    select: {
      code: true,
      rolePermissions: {
        where: {
          permission: { status: 'ACTIVE' },
        },
        select: {
          permission: {
            select: { code: true },
          },
        },
      },
    },
    orderBy: { code: 'asc' },
  });

  for (const role of roles) {
    console.log({
      role: role.code,
      permissions: role.rolePermissions.map(
        (item) => item.permission.code,
      ),
    });
  }

  console.log('\n=== REGIONS ===');

  console.log(
    await prisma.region.findMany({
      select: {
        id: true,
        name: true,
      },
    }),
  );

  console.log('\n=== DISTRICTS ===');

  console.log(
    await prisma.district.findMany({
      select: {
        id: true,
        name: true,
        regionId: true,
      },
      take: 30,
    }),
  );

  console.log('\n=== BRANCHES ===');

  console.log(
    await prisma.branch.findMany({
      select: {
        id: true,
        name: true,
        districtId: true,
      },
      take: 30,
    }),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });