/** Dedicated clean UAT bootstrap. Never import the development seed here. */
import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import { writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const EXPECTED_DB = 'digital_performance_uat';
const EXPECTED_USER = 'dpmp_uat_app';
const EXPECTED_HOST = 'localhost';
const APPROVAL = 'CREATE_CBE_SOUTH_WEST_UAT';

if (process.argv[2] !== '--apply' || process.env.UAT_SEED_CONFIRM !== APPROVAL) {
  throw new Error(`Refusing to write. Set UAT_SEED_CONFIRM=${APPROVAL} and pass --apply.`);
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing.');
const url = new URL(process.env.DATABASE_URL);
const db = decodeURIComponent(url.pathname.slice(1));
const username = decodeURIComponent(url.username);
if (url.protocol !== 'mysql:' || url.hostname !== EXPECTED_HOST ||
    (url.port && url.port !== '3306') || db !== EXPECTED_DB || username !== EXPECTED_USER) {
  throw new Error('SAFETY STOP: DATABASE_URL is not the approved local UAT connection.');
}
if (!url.password) throw new Error('Missing UAT database password.');
const adapter = new PrismaMariaDb({
  host: EXPECTED_HOST, port: 3306, user: username,
  password: decodeURIComponent(url.password), database: db, connectionLimit: 5,
});
const prisma = new PrismaClient({ adapter });

const region = { code: 'UAT_SW_REGION', name: 'CBE South West Region' };
const districts = [
  ['UAT_SW_BALE_ROBE', 'Bale Robe'],
  ['UAT_SW_ADAMA', 'Adama'],
  ['UAT_SW_ASSELA', 'Assela'],
  ['UAT_SW_SEMERA', 'Semera'],
  ['UAT_SW_DIRE_DEWA', 'Dire Dewa'],
  ['UAT_SW_JIJIGA', 'Jijiga'],
] as const;
// Exactly 50 branch names, in the order provided by the user.
const branchNames = [
  'Adaba','Agarfa','Al Manar','Al Munir','Al Nur','Ali','Angetu','Bale Goba',
  'Beltu','Bidire','Darul Hijra','Denbel Misra','Dewa Dina','Dinsho',
  'Dolo Sebro','Dolomena','Elbuko','Elkere','Ferhi','Gassera','Ghinnir',
  'Goba Robe','Goro','Hamilton','Harewa Anole','Haro dube','Haro Dumal',
  'Herero','Immi','Jara','Kachen','Medewelabu','Medina Jibri','Meliyou',
  'Meqbul','Micha','Misrak Immi','Obora','Rasso','Rayitu','Robe Gerjeda',
  'Sanete','Serer','Siko Mendo','Sinana','Sofumer','Tegona','Umer Alfaruk',
  'Wakena','Woleshe',
] as const;

const roles = [
  ['SUPER_ADMIN','Super Administrator'],
  ['SYSTEM_ADMIN','System Administrator'],
  ['REGIONAL_MANAGER','Regional Manager'],
  ['REGIONAL_ANALYST','Regional Analyst'],
  ['DISTRICT_MANAGER','District Manager'],
  ['DISTRICT_ANALYST','District Analyst'],
  ['BRANCH_MANAGER','Branch Manager'],
  ['DIGITAL_RESKILLED_STAFF','Digital Reskilled Staff'],
  ['AUDITOR','Auditor'],
  ['READ_ONLY','Read Only'],
] as const;

// Permission definitions mirror the existing development seed, without importing or running it.
const permissionCodes = [
  'dashboard.read',
  'region.create','region.read','region.update','region.delete',
  'district.create','district.read','district.update','district.delete',
  'branch.create','branch.read','branch.update','branch.delete',
  'user.create','user.read','user.update','user.delete',
  'role.create','role.read','role.update','permission.read','permission.assign',
  'product.create','product.read','product.update',
  'target.create','target.read','target.update','target.delete',
  'activity.create','activity.read','activity.update','activity.delete','activity.submit',
  'submission.read','submission.submit','submission.review','submission.approve',
  'followup.create','followup.read','followup.update','followup.manage','followup.reassign','followup.delete',
  'report.read','report.export','alert.read','alert.update','ai.read','ai.manage',
  'audit.read','settings.read','settings.update',
] as const;

const refRead = ['dashboard.read','region.read','district.read','branch.read','product.read','target.read'];
const operationsRead = ['activity.read','submission.read','followup.read','report.read','alert.read','ai.read'];
const managers = [...refRead,...operationsRead,'submission.review','submission.approve','followup.update','report.export','alert.update'];
const analysts = [...refRead,...operationsRead,'report.export'];
const rolePermissions: Record<string, readonly string[]> = {
  SUPER_ADMIN: permissionCodes,
  SYSTEM_ADMIN: ['dashboard.read','region.read','district.read','branch.read','user.create','user.read','user.update','user.delete','role.read','role.update','permission.read','permission.assign','product.create','product.read','product.update','report.read','report.export','audit.read','settings.read','settings.update'],
  REGIONAL_MANAGER: managers,
  REGIONAL_ANALYST: analysts,
  DISTRICT_MANAGER: managers,
  DISTRICT_ANALYST: analysts,
  BRANCH_MANAGER: managers,
  DIGITAL_RESKILLED_STAFF: [...refRead,'activity.create','activity.read','activity.update','submission.read','submission.submit','followup.create','followup.read','followup.update','alert.read'],
  AUDITOR: ['dashboard.read','region.read','district.read','branch.read','user.read','role.read','permission.read','product.read','target.read','activity.read','submission.read','followup.read','report.read','report.export','alert.read','ai.read','audit.read','settings.read'],
  READ_ONLY: [...refRead,...operationsRead],
};
const products = [
  ['CBE_BIRR','CBE Birr','MOBILE_MONEY'],
  ['MOBILE_BANKING','Mobile Banking','DIGITAL_BANKING'],
  ['INTERNET_BANKING','Internet Banking','DIGITAL_BANKING'],
  ['CARD','Card','CARD'],
  ['MERCHANT','Merchant','MERCHANT'],
  ['POS','POS','MERCHANT'],
  ['QR','QR','MERCHANT'],
] as const;
const accounts = [
  ['uat.superadmin','SUPER_ADMIN','GLOBAL','Super','Administrator'],
  ['uat.sysadmin','SYSTEM_ADMIN','GLOBAL','System','Administrator'],
  ['uat.regionmanager','REGIONAL_MANAGER','REGION','Regional','Manager'],
  ['uat.regionanalyst','REGIONAL_ANALYST','REGION','Regional','Analyst'],
  ['uat.districtmanager','DISTRICT_MANAGER','DISTRICT','District','Manager'],
  ['uat.districtanalyst','DISTRICT_ANALYST','DISTRICT','District','Analyst'],
  ['uat.branchmanager','BRANCH_MANAGER','BRANCH','Branch','Manager'],
  ['uat.digitalstaff','DIGITAL_RESKILLED_STAFF','STAFF','Digital','Staff'],
  ['uat.auditor','AUDITOR','GLOBAL','System','Auditor'],
  ['uat.readonly','READ_ONLY','REGION','Read','Only'],
] as const;

async function main() {
  if (branchNames.length !== 50 || new Set(branchNames).size !== 50) throw new Error('Branch list count or uniqueness error.');
  if (new Set(permissionCodes).size !== permissionCodes.length) throw new Error('Duplicate permission codes.');
  const [identity] = await prisma.$queryRaw<Array<{ db_name: string; db_user: string }>>`
    SELECT DATABASE() AS db_name, CURRENT_USER() AS db_user`;
  if (identity?.db_name !== EXPECTED_DB || identity?.db_user !== `${EXPECTED_USER}@localhost`) {
    throw new Error('SAFETY STOP: server-side database identity does not match UAT.');
  }
  const existing = await Promise.all([
    prisma.region.count(), prisma.district.count(), prisma.branch.count(),
    prisma.user.count(), prisma.role.count(), prisma.permission.count(),
    prisma.product.count(), prisma.systemSetting.count(),
  ]);
  if (existing.some(n => n !== 0)) throw new Error(`Refusing to seed nonempty UAT reference tables: ${existing.join(', ')}`);

  // Passwords are generated once, held in memory, and saved only after a successful transaction.
  const credentials = await Promise.all(accounts.map(async ([name]) => {
    const password = randomBytes(24).toString('base64url');
    return { username: name, password, hash: await argon2.hash(password) };
  }));
  const credentialPath = resolve(process.cwd(), 'uat-initial-credentials.json');
  if (existsSync(credentialPath)) throw new Error('Credential output file already exists. Move it before seeding.');

  await prisma.$transaction(async tx => {
    const r = await tx.region.create({ data: { ...region, status: 'ACTIVE' } });
    const districtIds = new Map<string, string>();
    for (const [code,name] of districts) {
      const d = await tx.district.create({ data: { code, name, regionId: r.id, status: 'ACTIVE' } });
      districtIds.set(name,d.id);
    }
    const robeId = districtIds.get('Bale Robe')!;
    let sofumerId = '';
    for (let i = 0; i < branchNames.length; i++) {
      const name = branchNames[i];
      const branch = await tx.branch.create({ data: {
        code: `UAT_SW_BR_${String(i+1).padStart(3,'0')}`,
        name, districtId: robeId, branchType: 'BRANCH',
        timezone: 'Africa/Addis_Ababa', status: 'ACTIVE',
      }});
      if (name === 'Sofumer') sofumerId = branch.id;
    }
    if (!sofumerId) throw new Error('Sofumer branch missing.');

    const roleIds = new Map<string,string>();
    for (const [code,name] of roles) {
      const role = await tx.role.create({ data: { code, name, isSystemRole: true } });
      roleIds.set(code,role.id);
    }
    const permissionIds = new Map<string,string>();
    for (const code of permissionCodes) {
      const dot = code.lastIndexOf('.');
      const module = code.slice(0,dot);
      const action = code.slice(dot+1);
      const permission = await tx.permission.create({ data: {
        code, module, action, name: `${action} ${module}`,
      }});
      permissionIds.set(code,permission.id);
    }
    for (const [roleCode, codes] of Object.entries(rolePermissions)) {
      const roleId = roleIds.get(roleCode)!;
      for (const code of new Set(codes)) {
        const permissionId = permissionIds.get(code);
        if (!permissionId) throw new Error(`Unknown permission ${code} in ${roleCode}`);
        await tx.rolePermission.create({ data: { roleId, permissionId } });
      }
    }
    for (let i=0;i<products.length;i++) {
      const [code,name,category] = products[i];
      await tx.product.create({ data: { code,name,category,displayOrder:i+1,status:'ACTIVE' } });
    }
    for (let i=0;i<accounts.length;i++) {
      const [username,roleCode,scopeType,firstName,lastName] = accounts[i];
      const user = await tx.user.create({ data: {
        username,firstName,lastName,passwordHash:credentials[i].hash,
        status:'ACTIVE',mustChangePassword:true,mfaEnabled:false,
      }});
      await tx.userRole.create({ data: {
        userId:user.id,roleId:roleIds.get(roleCode)!,scopeType,
        ...(scopeType === 'GLOBAL' ? {} : {regionId:r.id}),
        ...(scopeType === 'DISTRICT' || scopeType === 'BRANCH' || scopeType === 'STAFF' ? {districtId:robeId} : {}),
        ...(scopeType === 'BRANCH' || scopeType === 'STAFF' ? {branchId:sofumerId} : {}),
      }});
      if (scopeType === 'STAFF') {
        await tx.staffProfile.create({ data: {
          userId:user.id,branchId:sofumerId,employeeNumber:'UAT-DRS-0001',
          jobTitle:'Digital Reskilled Staff',digitalReskilled:true,status:'ACTIVE',
        }});
      }
    }
    const settings = [
      ['APP_NAME','Digital Performance Monitoring Platform','GENERAL',true],
      ['DEFAULT_TIMEZONE','Africa/Addis_Ababa','GENERAL',true],
      ['FAILED_LOGIN_LIMIT',5,'SECURITY',false],
      ['ACCOUNT_LOCK_MINUTES',15,'SECURITY',false],
      ['DAILY_SUBMISSION_REQUIRED',true,'PERFORMANCE',false],
    ] as const;
    for (const [key,value,category,isPublic] of settings) {
      await tx.systemSetting.create({ data: { key,value,category,isPublic } });
    }
  }, { maxWait: 10000, timeout: 120000 });

  // Treat this file as a secret. It contains one-time initial passwords.
  writeFileSync(credentialPath, JSON.stringify(credentials.map(({username,password}) => ({username,password})),null,2), { flag:'wx', mode:0o600 });
  console.log('UAT seed succeeded: 1 region, 6 districts, 50 branches, 10 roles, 7 products, 10 users.');
  console.log(`Initial passwords saved to ${credentialPath}. Secure this file immediately; do not upload it or commit it.`);
}

main().catch(error => { console.error('UAT seed failed:', error); process.exitCode=1; })
  .finally(async () => { await prisma.$disconnect(); });
