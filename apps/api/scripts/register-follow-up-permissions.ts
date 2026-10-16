
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import 'dotenv/config';

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
    const permissions = [
      {
        code: 'followup.manage',
        module: 'followup',
        action: 'manage',
        name: 'Manage follow-up availability',
        description: 'Enable or disable customer follow-ups.',
      },
      {
        code: 'followup.delete',
        module: 'followup',
        action: 'delete',
        name: 'Delete follow-up',
        description: 'Soft-delete customer follow-ups.',
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

      console.log(`Registered: ${permission.code}`);
    }

    const registered = await prisma.permission.findMany({
      where: {
        code: {
          in: ['followup.manage', 'followup.delete'],
        },
      },
      select: {
        code: true,
        status: true,
      },
    });

    console.table(registered);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
