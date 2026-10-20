import 'dotenv/config';

import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import argon2 from 'argon2';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../src/generated/prisma/client.js';

const TARGET_DATABASE = 'digital_performance';
const EXPECTED_COUNT = 50;

const root = resolve(process.cwd(), '../..');
const csvPath = resolve(root, 'imports/branch_managers.csv');
const credentialsDir = resolve(root, 'private/credentials');

if (process.env.DATABASE_NAME !== TARGET_DATABASE) {
  throw new Error(
    `Database mismatch. Expected ${TARGET_DATABASE}, received ${process.env.DATABASE_NAME}`,
  );
}

if (process.env.IMPORT_CONFIRM_DATABASE !== TARGET_DATABASE) {
  throw new Error('Explicit database confirmation is required.');
}

const requiredEnvironment = [
  'DATABASE_HOST',
  'DATABASE_USER',
  'DATABASE_PASSWORD',
];

for (const key of requiredEnvironment) {
  if (!process.env[key]) {
    throw new Error(`Missing environment variable: ${key}`);
  }
}

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST!,
  port: Number(process.env.DATABASE_PORT || '3306'),
  user: process.env.DATABASE_USER!,
  password: process.env.DATABASE_PASSWORD!,
  database: TARGET_DATABASE,
  connectionLimit: 5,
  allowPublicKeyRetrieval: true,
});

const prisma = new PrismaClient({ adapter });

type Manager = {
  branchCode: string;
  managerName: string;
  username: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  branchId: string;
  districtId: string;
  regionId: string;
  password: string;
  passwordHash: string;
};

async function main() {
  const actualDatabase = await prisma.$queryRaw<
    Array<{ databaseName: string | null }>
  >`SELECT DATABASE() AS databaseName`;

  if (actualDatabase[0]?.databaseName !== TARGET_DATABASE) {
    throw new Error('Connected to an unexpected database.');
  }

  const raw = readFileSync(csvPath, 'utf8')
    .replace(/^\uFEFF/, '')
    .trim();

  const lines = raw.split(/\r?\n/);

  if (lines[0].trim() !== 'branchCode,managerName') {
    throw new Error('Unexpected CSV header.');
  }

  const records = lines.slice(1).map((line) => {
    const parts = line.split(',');

    if (parts.length !== 2) {
      throw new Error(`Invalid CSV record: ${line}`);
    }

    return {
      branchCode: parts[0].trim(),
      managerName: parts[1].trim(),
    };
  });

  if (records.length !== EXPECTED_COUNT) {
    throw new Error(`Expected 50 records; found ${records.length}.`);
  }

  const codes = records.map((r) => r.branchCode);
  const usernames = codes.map((code) => `bm.${code.toLowerCase()}`);

  if (
    new Set(codes).size !== EXPECTED_COUNT ||
    new Set(usernames).size !== EXPECTED_COUNT
  ) {
    throw new Error('Duplicate branch codes or usernames.');
  }

  for (const record of records) {
    if (!/^BRD_[A-Z0-9_]+$/.test(record.branchCode)) {
      throw new Error(`Invalid branch code: ${record.branchCode}`);
    }

    if (record.managerName.split(/\s+/).length < 2) {
      throw new Error(`Incomplete manager name: ${record.branchCode}`);
    }
  }

  const branches = await prisma.branch.findMany({
    where: {
      code: { in: codes },
      deletedAt: null,
      status: 'ACTIVE',
      district: {
        is: {
          code: 'SW_BALE_ROBE',
          deletedAt: null,
          region: {
            is: {
              code: 'SW_REGION',
              deletedAt: null,
            },
          },
        },
      },
    },
    include: {
      district: true,
    },
  });

  if (branches.length !== EXPECTED_COUNT) {
    throw new Error('Not all 50 active branches matched the expected district.');
  }

  const existingUsers = await prisma.user.findMany({
    where: {
      username: { in: usernames },
    },
    select: { username: true },
  });

  if (existingUsers.length > 0) {
    throw new Error(
      `Username conflicts detected: ${existingUsers.length}. No changes made.`,
    );
  }

  const role = await prisma.role.findUnique({
    where: { code: 'BRANCH_MANAGER' },
  });

  if (!role || role.status !== 'ACTIVE') {
    throw new Error('Active BRANCH_MANAGER role not found.');
  }

  const branchMap = new Map(
    branches.map((branch) => [branch.code, branch]),
  );

  const managers: Manager[] = [];

  for (const record of records) {
    const branch = branchMap.get(record.branchCode);

    if (!branch) {
      throw new Error(`Branch missing: ${record.branchCode}`);
    }

    const nameParts = record.managerName.split(/\s+/);

    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];
    const middleName = nameParts.slice(1, -1).join(' ') || undefined;

    const password = randomBytes(24).toString('base64url');
    const passwordHash = await argon2.hash(password);

    managers.push({
      branchCode: record.branchCode,
      managerName: record.managerName,
      username: `bm.${record.branchCode.toLowerCase()}`,
      firstName,
      middleName,
      lastName,
      branchId: branch.id,
      districtId: branch.districtId,
      regionId: branch.district.regionId,
      password,
      passwordHash,
    });
  }

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-');

  const credentialsPath = resolve(
    credentialsDir,
    `branch_manager_credentials_${timestamp}.csv`,
  );

  if (!existsSync(credentialsDir)) {
    throw new Error('Protected credentials directory does not exist.');
  }

  const credentialsContent = [
    'branchCode,managerName,username,temporaryPassword',
    ...managers.map((manager) =>
      [
        manager.branchCode,
        manager.managerName,
        manager.username,
        manager.password,
      ].join(','),
    ),
  ].join('\r\n');

  let committed = false;

  try {
    // Write credentials before committing users, so a file-write
    // failure cannot leave accounts with unrecoverable passwords.
    writeFileSync(credentialsPath, credentialsContent, {
      flag: 'wx',
      mode: 0o600,
    });

    await prisma.$transaction(
      async (tx) => {
        for (const manager of managers) {
          const user = await tx.user.create({
            data: {
              username: manager.username,
              passwordHash: manager.passwordHash,
              firstName: manager.firstName,
              middleName: manager.middleName,
              lastName: manager.lastName,
              status: 'ACTIVE',
              mustChangePassword: true,
            },
          });

          await tx.userRole.create({
            data: {
              userId: user.id,
              roleId: role.id,
              scopeType: 'BRANCH',
              regionId: manager.regionId,
              districtId: manager.districtId,
              branchId: manager.branchId,
            },
          });
        }
      },
      {
        maxWait: 15000,
        timeout: 120000,
      },
    );

    committed = true;
  } finally {
    if (!committed && existsSync(credentialsPath)) {
      unlinkSync(credentialsPath);
    }
  }

  const created = await prisma.user.count({
    where: {
      username: { in: usernames },
      status: 'ACTIVE',
      mustChangePassword: true,
    },
  });

  const assigned = await prisma.userRole.count({
    where: {
      user: { username: { in: usernames } },
      roleId: role.id,
      scopeType: 'BRANCH',
    },
  });

  console.log('IMPORT COMPLETED');
  console.log(`Database: ${TARGET_DATABASE}`);
  console.log(`Active manager accounts: ${created}`);
  console.log(`Branch role assignments: ${assigned}`);
  console.log(`Credentials file: ${credentialsPath}`);

  if (created !== EXPECTED_COUNT || assigned !== EXPECTED_COUNT) {
    throw new Error('Post-import verification failed.');
  }
}

main()
  .catch((error) => {
    console.error('IMPORT FAILED:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
