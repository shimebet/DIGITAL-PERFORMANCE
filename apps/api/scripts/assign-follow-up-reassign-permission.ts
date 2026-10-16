import 'dotenv/config';

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const CODE = 'followup.reassign';

const approvedRoles = [
  'SUPER_ADMIN',
  'SYSTEM_ADMIN',
  'REGIONAL_MANAGER',
  'DISTRICT_MANAGER',
  'BRANCH_MANAGER',
] as const;

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
        code: { in: [...approvedRoles] },
      },
      select: {
        id: true,
        code: true,
        status: true,
      },
    });

    for (const code of approvedRoles) {
      const role = roles.find((item) => item.code === code);

      if (!role || role.status !== 'ACTIVE') {
        throw new Error(`Required active role missing: ${code}`);
      }
    }

    const existingPermission = await prisma.permission.findUnique({
      where: { code: CODE },
      include: {
        rolePermissions: {
          include: {
            role: {
              select: { code: true },
            },
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
      `follow-up-reassign-permission-${timestamp}.json`,
    );

    await writeFile(
      backupPath,
      JSON.stringify(
        {
          createdAt: new Date().toISOString(),
          permission: existingPermission,
          approvedRoles,
        },
        null,
        2,
      ),
      { encoding: 'utf8', flag: 'wx' },
    );

    console.log('Backup created:', backupPath);

    await prisma.$transaction(async (tx) => {
      const permission = await tx.permission.upsert({
        where: { code: CODE },
        update: {
          module: 'followup',
          action: 'reassign',
          name: 'Reassign follow-up',
          description:
            'Transfer customer follow-ups between authorized employees.',
          status: 'ACTIVE',
        },
        create: {
          code: CODE,
          module: 'followup',
          action: 'reassign',
          name: 'Reassign follow-up',
          description:
            'Transfer customer follow-ups between authorized employees.',
          status: 'ACTIVE',
        },
      });

      for (const role of roles) {
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

      await tx.rolePermission.deleteMany({
        where: {
          permissionId: permission.id,
          roleId: {
            notIn: roles.map((role) => role.id),
          },
        },
      });

      const finalAssignments = await tx.rolePermission.findMany({
        where: { permissionId: permission.id },
        select: {
          role: {
            select: { code: true },
          },
        },
      });

      const actual = new Set(
        finalAssignments.map((item) => item.role.code),
      );

      if (
        actual.size !== approvedRoles.length ||
        approvedRoles.some((code) => !actual.has(code))
      ) {
        throw new Error(
          'Reassignment permission verification failed. Transaction rolled back.',
        );
      }
    });

    console.log('Reassignment permission configured successfully.');
    console.log('Approved roles:', approvedRoles.join(', '));
    console.log('Other permissions were not modified.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
