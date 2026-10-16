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
    const deletedFollowUps = await prisma.followUp.findMany({
      where: {
        deletedAt: {
          not: null,
        },
      },
      select: {
        id: true,
        customerReference: true,
        customerNameMasked: true,
        isEnabled: true,
        deletedAt: true,
        deletedByUserId: true,
        _count: {
          select: {
            history: true,
          },
        },
      },
      orderBy: {
        deletedAt: 'desc',
      },
      take: 10,
    });

    console.log('\nSOFT-DELETED FOLLOW-UPS');
    console.log('Count in latest 10:', deletedFollowUps.length);

    for (const followUp of deletedFollowUps) {
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          module: 'FOLLOW_UPS',
          entityType: 'FollowUp',
          entityId: followUp.id,
          action: 'DELETE',
        },
        select: {
          id: true,
          userId: true,
          action: true,
          description: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      console.log('\n----------------------------------------');
      console.log('Follow-up ID:', followUp.id);
      console.log('Customer reference:', followUp.customerReference);
      console.log('Customer:', followUp.customerNameMasked);
      console.log('Enabled:', followUp.isEnabled);
      console.log('Deleted at:', followUp.deletedAt);
      console.log('Deleted by:', followUp.deletedByUserId);
      console.log('History records:', followUp._count.history);
      console.log('DELETE audit records:', auditLogs.length);

      if (
        followUp.deletedAt &&
        followUp.deletedByUserId &&
        auditLogs.some(
          (log) => log.userId === followUp.deletedByUserId,
        )
      ) {
        console.log('Verification: PASSED');
      } else {
        console.log('Verification: NEEDS INVESTIGATION');
      }
    }

    if (deletedFollowUps.length === 0) {
      console.log(
        '\nNo soft-deleted follow-ups found. ' +
        'Run this verification after deleting a disposable test record.',
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
