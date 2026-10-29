
import {
  describe,
  expect,
  it,
} from 'vitest';

import { BadRequestException } from '@nestjs/common';

import {
  parseTargetAssignmentImportCsv,
} from './targets-import.parser.js';

import {
  TARGET_ASSIGNMENT_IMPORT_COLUMNS,
} from './targets-import.types.js';

describe('Target Assignment CSV Parser', () => {
  const targetId = '550e8400-e29b-41d4-a716-446655440000';
  const parentId = '550e8400-e29b-41d4-a716-446655440001';
  const regionId = '550e8400-e29b-41d4-a716-446655440002';

  const headers = TARGET_ASSIGNMENT_IMPORT_COLUMNS.join(',');

  const csv = (row: string): Buffer =>
    Buffer.from(`${headers}\n${row}\n`, 'utf8');

  const globalRow = [
    targetId,
    'GLOBAL',
    '',
    '',
    '',
    '',
    '',
    '',
    '1000',
  ].join(',');

  const regionRow = [
    targetId,
    'REGION',
    parentId,
    regionId,
    '',
    '',
    '',
    '',
    '300',
  ].join(',');

  it('parses a valid GLOBAL assignment', () => {
    const result = parseTargetAssignmentImportCsv(
      csv(globalRow),
    );

    expect(result.errors).toEqual([]);
    expect(result.totalRows).toBe(1);
    expect(result.rows).toHaveLength(1);

    expect(result.rows[0]).toMatchObject({
      rowNumber: 2,
      targetId,
      scopeType: 'GLOBAL',
      targetValue: 1000,
    });
  });

  it('parses a valid REGION assignment', () => {
    const result = parseTargetAssignmentImportCsv(
      csv(regionRow),
    );

    expect(result.errors).toEqual([]);
    expect(result.rows[0]).toMatchObject({
      scopeType: 'REGION',
      parentAssignmentId: parentId,
      regionId,
      targetValue: 300,
    });
  });

  it('accepts a target value with two decimal places', () => {
    const row = globalRow.replace(
      ',1000',
      ',1000.25',
    );

    const result = parseTargetAssignmentImportCsv(
      csv(row),
    );

    expect(result.errors).toEqual([]);
    expect(result.rows[0]?.targetValue).toBe(1000.25);
  });

it('rejects a target value with more than two decimal places', () => {
  const row = globalRow.replace(
    ',1000',
    ',1000.123',
  );

  const result = parseTargetAssignmentImportCsv(
    csv(row),
  );

  expect(result.rows).toHaveLength(0);

  expect(result.errors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        row: 2,
        field: 'targetValue',
      }),
    ]),
  );
});

  it('rejects zero target value', () => {
    const row = globalRow.replace(
      ',1000',
      ',0',
    );

    const result = parseTargetAssignmentImportCsv(
      csv(row),
    );

    expect(result.rows).toHaveLength(0);
    expect(result.errors[0]?.field).toBe('targetValue');
  });

  it('rejects negative target value', () => {
    const row = globalRow.replace(
      ',1000',
      ',-100',
    );

    const result = parseTargetAssignmentImportCsv(
      csv(row),
    );

    expect(result.rows).toHaveLength(0);
    expect(result.errors[0]?.field).toBe('targetValue');
  });

  it('rejects invalid target UUID', () => {
    const row = globalRow.replace(
      targetId,
      'invalid-uuid',
    );

    const result = parseTargetAssignmentImportCsv(
      csv(row),
    );

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'targetId',
        }),
      ]),
    );
  });

  it('rejects an invalid scope', () => {
    const row = globalRow.replace(
      'GLOBAL',
      'INVALID',
    );

    const result = parseTargetAssignmentImportCsv(
      csv(row),
    );

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'scopeType',
        }),
      ]),
    );
  });

  it('rejects GLOBAL assignment with parent', () => {
    const row = [
      targetId,
      'GLOBAL',
      parentId,
      '',
      '',
      '',
      '',
      '',
      '100',
    ].join(',');

    const result = parseTargetAssignmentImportCsv(
      csv(row),
    );

    expect(result.rows).toHaveLength(0);
    expect(result.errors[0]?.field).toBe(
      'parentAssignmentId',
    );
  });

  it('rejects REGION assignment without parent', () => {
    const row = [
      targetId,
      'REGION',
      '',
      regionId,
      '',
      '',
      '',
      '',
      '100',
    ].join(',');

    const result = parseTargetAssignmentImportCsv(
      csv(row),
    );

    expect(result.rows).toHaveLength(0);
    expect(result.errors[0]?.field).toBe(
      'parentAssignmentId',
    );
  });

  it('rejects incorrect CSV headers', () => {
    const file = Buffer.from(
      'targetId,scopeType,targetValue\n',
    );

    expect(() =>
      parseTargetAssignmentImportCsv(file),
    ).toThrow(BadRequestException);
  });

  it('rejects an empty CSV file', () => {
    expect(() =>
      parseTargetAssignmentImportCsv(Buffer.alloc(0)),
    ).toThrow(BadRequestException);
  });

  it('rejects a CSV containing only headers', () => {
    const result = parseTargetAssignmentImportCsv(
      Buffer.from(`${headers}\n`),
    );

    expect(result.totalRows).toBe(0);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'CSV must contain at least one data row',
        }),
      ]),
    );
  });

  it('rejects CSV files larger than 1 MB', () => {
    const file = Buffer.alloc(
      1024 * 1024 + 1,
      'a',
    );

    expect(() =>
      parseTargetAssignmentImportCsv(file),
    ).toThrow(BadRequestException);
  });

  it('rejects CSV files containing more than 2000 rows', () => {
    const file = Buffer.from(
      [
        headers,
        ...Array(2001).fill(globalRow),
      ].join('\n'),
    );

    expect(() =>
      parseTargetAssignmentImportCsv(file),
    ).toThrow(BadRequestException);
  });
});
