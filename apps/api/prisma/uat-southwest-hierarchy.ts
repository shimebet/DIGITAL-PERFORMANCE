import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const REGION = {
  code: 'UAT_SW_REGION',
  name: 'CBE South West Region',
};

const DISTRICTS = [
  { code: 'UAT_SW_ROBE', name: 'Robe' },
  { code: 'UAT_SW_ADAMA', name: 'Adama' },
  { code: 'UAT_SW_ASSELA', name: 'Assela' },
  { code: 'UAT_SW_SEMERA', name: 'Semera' },
  { code: 'UAT_SW_DIRE_DEWA', name: 'Dire Dewa' },
  { code: 'UAT_SW_JIJIGA', name: 'Jijiga' },
] as const;

const BRANCHES = [
  { code: 'UAT_SW_SOFUMER', name: 'Sofumer' },
  { code: 'UAT_SW_ALNUR', name: 'Alnur' },
  { code: 'UAT_SW_SINANA', name: 'Sinana' },
  { code: 'UAT_SW_BALE_GOBA', name: 'Bale Goba' },
  { code: 'UAT_SW_DELO_MENA', name: 'Delo Mena' },
  { code: 'UAT_SW_GHNNIR', name: 'Ghnnir' },
  { code: 'UAT_SW_ADABA', name: 'Adaba' },
] as const;

const APPLY = process.argv.includes('--apply');

const url = new URL(process.env.DATABASE_URL ?? '');

if (!['mysql:', 'mariadb:'].includes(url.protocol)) {
  throw new Error('Expected a MySQL/MariaDB DATABASE_URL');
}

const databaseName = decodeURIComponent(url.pathname.slice(1));

if (!databaseName || !url.hostname) {
  throw new Error('Incomplete DATABASE_URL');
}

const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: databaseName,
  connectionLimit: 2,
});

const prisma = new PrismaClient({ adapter });

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase('en');
}

function checkRecord(
  kind: string,
  wanted: { code: string; name: string },
  records: Array<{
    id: string;
    code: string;
    name: string;
    deletedAt: Date | null;
    status: string;
    parentId?: string;
  }>,
  expectedParentId?: string,
): string | undefined {
  const byCode = records.filter(
    (r) => normalize(r.code) === normalize(wanted.code),
  );

  const byName = records.filter(
    (r) => normalize(r.name) === normalize(wanted.name),
  );

  if (byCode.length > 1 || byName.length > 1) {
    throw new Error(
      `Ambiguous ${kind}: ${wanted.name}; multiple matches`,
    );
  }

  const record = byCode[0];

  if (!record) {
    if (byName.length) {
      throw new Error(
        `${kind} name already exists under another code: ${wanted.name}`,
      );
    }

    console.log(`CREATE ${kind}: ${wanted.code} / ${wanted.name}`);
    return undefined;
  }

  if (
    normalize(record.name) !== normalize(wanted.name) ||
    record.deletedAt !== null ||
    record.status !== 'ACTIVE'
  ) {
    throw new Error(
      `Conflicting or inactive ${kind}: ${wanted.code}`,
    );
  }

  if (
    expectedParentId !== undefined &&
    record.parentId !== expectedParentId
  ) {
    throw new Error(
      `${kind} belongs to a different parent: ${wanted.name}`,
    );
  }

  console.log(`REUSE ${kind}: ${wanted.code} / ${wanted.name}`);
  return record.id;
}

async function inspect(tx: typeof prisma) {
  const [regions, districts, branches] = await Promise.all([
    tx.region.findMany(),
    tx.district.findMany(),
    tx.branch.findMany(),
  ]);

  const regionId = checkRecord(
    'REGION',
    REGION,
    regions,
  );

  const districtIds = new Map<string, string | undefined>();

  for (const wanted of DISTRICTS) {
    const id = checkRecord(
      'DISTRICT',
      wanted,
      districts.map((d) => ({
        ...d,
        parentId: d.regionId,
      })),
      regionId,
    );

    // If the region does not yet exist, a reused district
    // would be unsafe: its parent cannot be verified.
    if (!regionId && id) {
      throw new Error(
        `Cannot reuse district ${wanted.name} without its region`,
      );
    }

    districtIds.set(wanted.code, id);
  }

  const robeId = districtIds.get('UAT_SW_ROBE');

  for (const wanted of BRANCHES) {
    const id = checkRecord(
      'BRANCH',
      wanted,
      branches.map((b) => ({
        ...b,
        parentId: b.districtId,
      })),
      robeId,
    );

    if (!robeId && id) {
      throw new Error(
        `Cannot reuse branch ${wanted.name} without Robe District`,
      );
    }
  }
}

async function main() {
  const identity = await prisma.$queryRaw<
    Array<{ db: string; host: string }>
  >`SELECT DATABASE() AS db, @@hostname AS host`;

  console.log('Mode:', APPLY ? 'APPLY' : 'DRY_RUN');
  console.log('Database:', identity[0]?.db);
  console.log('Server:', identity[0]?.host);

  if (identity[0]?.db !== databaseName) {
    throw new Error('Database identity mismatch');
  }

  if (!APPLY) {
    await inspect(prisma);
    console.log('DRY RUN COMPLETE: no database writes');
    return;
  }

  if (
    process.env.UAT_APPROVED_DATABASE !== databaseName ||
    process.env.UAT_BACKUP_VERIFIED !== 'YES' ||
    process.env.UAT_HIERARCHY_CONFIRM !==
      'CREATE_CBE_SOUTH_WEST_UAT_HIERARCHY'
  ) {
    throw new Error(
      'APPLY blocked: database approval, backup verification or confirmation missing',
    );
  }

  await prisma.$transaction(async (tx) => {
    // Recheck the database immediately before changes.
    await inspect(tx as typeof prisma);

    const region = await tx.region.upsert({
      where: { code: REGION.code },
      create: {
        ...REGION,
        description: 'Approved business UAT hierarchy',
      },
      update: {},
    });

    const districtIds = new Map<string, string>();

    for (const wanted of DISTRICTS) {
      const district = await tx.district.upsert({
        where: { code: wanted.code },
        create: {
          ...wanted,
          regionId: region.id,
          description: 'Approved business UAT hierarchy',
        },
        update: {},
      });

      districtIds.set(wanted.code, district.id);
    }

    const robeId = districtIds.get('UAT_SW_ROBE');

    if (!robeId) {
      throw new Error('Robe District ID not found');
    }

    for (const wanted of BRANCHES) {
      await tx.branch.upsert({
        where: { code: wanted.code },
        create: {
          ...wanted,
          districtId: robeId,
          timezone: 'Africa/Addis_Ababa',
        },
        update: {},
      });
    }
  });

  console.log('APPLY COMPLETE: hierarchy transaction committed');

  // Post-commit validation.
  await inspect(prisma);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });