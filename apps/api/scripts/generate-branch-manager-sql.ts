import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import argon2 from 'argon2';

const root = resolve(process.cwd(), '../..');
const input = resolve(root, 'imports/branch_managers.csv');
const output = resolve(root, 'imports/branch_managers_import.sql');
const credentialsDir = resolve(root, 'private/credentials');

if (!existsSync(credentialsDir)) {
  throw new Error('Protected credentials directory is missing.');
}

if (existsSync(output)) {
  throw new Error('Import SQL already exists. Refusing to overwrite.');
}

const lines = readFileSync(input, 'utf8')
  .replace(/^\uFEFF/, '')
  .trim()
  .split(/\r?\n/);

if (lines[0] !== 'branchCode,managerName') {
  throw new Error('Invalid CSV header.');
}

const records = lines.slice(1).map((line) => {
  const parts = line.split(',');

  if (parts.length !== 2) {
    throw new Error('Invalid CSV row.');
  }

  return {
    branchCode: parts[0].trim(),
    managerName: parts[1].trim(),
  };
});

if (
  records.length !== 50 ||
  new Set(records.map((r) => r.branchCode)).size !== 50
) {
  throw new Error('Expected 50 unique branch codes.');
}

function quote(value: string): string {
  return "'" + value.replace(/'/g, "''") + "'";
}

const values: string[] = [];
const credentials: string[] = [
  'branchCode,managerName,username,temporaryPassword',
];

for (const record of records) {
  if (!/^BRD_[A-Z0-9_]+$/.test(record.branchCode)) {
    throw new Error(`Invalid branch code: ${record.branchCode}`);
  }

  const names = record.managerName.split(/\s+/);

  if (names.length < 2) {
    throw new Error(`Incomplete name: ${record.branchCode}`);
  }

  const firstName = names[0];
  const lastName = names[names.length - 1];
  const middleName = names.slice(1, -1).join(' ');

  const username = `bm.${record.branchCode.toLowerCase()}`;
  const password = randomBytes(24).toString('base64url');
  const passwordHash = await argon2.hash(password);

  values.push(
    '(' +
      [
        quote(record.branchCode),
        quote(username),
        quote(firstName),
        middleName ? quote(middleName) : 'NULL',
        quote(lastName),
        quote(passwordHash),
      ].join(', ') +
    ')',
  );

  credentials.push(
    [
      record.branchCode,
      record.managerName,
      username,
      password,
    ].join(','),
  );
}

const sql = `
USE digital_performance;

CREATE TEMPORARY TABLE import_branch_managers (
  branchCode VARCHAR(50) NOT NULL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  firstName VARCHAR(100) NOT NULL,
  middleName VARCHAR(100) NULL,
  lastName VARCHAR(100) NOT NULL,
  passwordHash VARCHAR(255) NOT NULL
);

INSERT INTO import_branch_managers
(branchCode, username, firstName, middleName, lastName, passwordHash)
VALUES
${values.join(',\n')};

START TRANSACTION;

INSERT INTO users (
  id,
  username,
  passwordHash,
  firstName,
  middleName,
  lastName,
  status,
  mustChangePassword,
  createdAt,
  updatedAt
)
SELECT
  UUID(),
  i.username,
  i.passwordHash,
  i.firstName,
  i.middleName,
  i.lastName,
  'ACTIVE',
  1,
  NOW(),
  NOW()
FROM import_branch_managers i
JOIN branches b ON b.code = i.branchCode
JOIN districts d ON d.id = b.districtId
JOIN regions r ON r.id = d.regionId
WHERE b.deletedAt IS NULL
  AND d.deletedAt IS NULL
  AND r.deletedAt IS NULL
  AND d.code = 'SW_BALE_ROBE'
  AND r.code = 'SW_REGION';

INSERT INTO user_roles (
  id,
  userId,
  roleId,
  scopeType,
  regionId,
  districtId,
  branchId,
  createdAt,
  updatedAt
)
SELECT
  UUID(),
  u.id,
  role.id,
  'BRANCH',
  r.id,
  d.id,
  b.id,
  NOW(),
  NOW()
FROM import_branch_managers i
JOIN users u ON u.username = i.username
JOIN branches b ON b.code = i.branchCode
JOIN districts d ON d.id = b.districtId
JOIN regions r ON r.id = d.regionId
JOIN roles role ON role.code = 'BRANCH_MANAGER'
WHERE role.status = 'ACTIVE';

COMMIT;

SELECT COUNT(*) AS importedManagers
FROM users
WHERE username LIKE 'bm.brd\\\\_%';

SELECT COUNT(*) AS managerRoleAssignments
FROM user_roles ur
JOIN users u ON u.id = ur.userId
JOIN roles r ON r.id = ur.roleId
WHERE u.username LIKE 'bm.brd\\\\_%'
  AND r.code = 'BRANCH_MANAGER';
`;

const timestamp = new Date()
  .toISOString()
  .replace(/[:.]/g, '-');

const credentialsPath = resolve(
  credentialsDir,
  `branch_manager_credentials_${timestamp}.csv`,
);

writeFileSync(credentialsPath, credentials.join('\r\n'), {
  flag: 'wx',
  mode: 0o600,
});

writeFileSync(output, sql, {
  flag: 'wx',
});

console.log('SQL file generated:', output);
console.log('Manager records:', records.length);
console.log('Credentials stored securely:', credentialsPath);
