
import { BadRequestException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';

import { ScopeType } from '../../../generated/prisma/enums.js';

import {
  TARGET_ASSIGNMENT_IMPORT_COLUMNS,
  type TargetAssignmentImportRow,
  type TargetImportError,
} from './targets-import.types.js';

export interface ParsedTargetImport {
  rows: TargetAssignmentImportRow[];
  errors: TargetImportError[];
  totalRows: number;
}

const MAX_FILE_BYTES = 1024 * 1024;
const MAX_ROWS = 2000;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const UUID_FIELDS = [
  'targetId',
  'parentAssignmentId',
  'regionId',
  'districtId',
  'branchId',
  'userId',
  'productId',
] as const;

const SCOPE_VALUES = new Set<string>(
  Object.values(ScopeType),
);

export function parseTargetAssignmentImportCsv(
  file: Buffer,
): ParsedTargetImport {
  if (!file || file.length === 0) {
    throw new BadRequestException('CSV file is empty');
  }

  if (file.length > MAX_FILE_BYTES) {
    throw new BadRequestException(
      'CSV file exceeds the 1 MB limit',
    );
  }

  let records: Record<string, string>[];

  try {
    records = parse(file, {
      columns: (headers: string[]) => {
        const actual = headers.map((header) => header.trim());
        const expected = [...TARGET_ASSIGNMENT_IMPORT_COLUMNS];

        if (
          actual.length !== expected.length ||
          actual.some(
            (header, index) => header !== expected[index],
          )
        ) {
          throw new Error(
            'CSV headers must exactly match the approved target assignment template',
          );
        }

        return actual;
      },
      bom: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: false,
      skip_records_with_error: false,
    });
  } catch (error) {
    throw new BadRequestException(
      error instanceof Error
        ? error.message
        : 'Invalid CSV format',
    );
  }

  if (records.length > MAX_ROWS) {
    throw new BadRequestException(
      `CSV cannot contain more than ${MAX_ROWS} rows`,
    );
  }

  const rows: TargetAssignmentImportRow[] = [];
  const errors: TargetImportError[] = [];

  records.forEach((record, index) => {
    const rowNumber = index + 2;
    let invalid = false;

    for (const field of UUID_FIELDS) {
      const value = record[field]?.trim() ?? '';

      if (field === 'targetId' && !value) {
        errors.push({
          row: rowNumber,
          field,
          message: 'targetId is required',
        });
        invalid = true;
        continue;
      }

      if (value && !UUID_PATTERN.test(value)) {
        errors.push({
          row: rowNumber,
          field,
          message: `${field} must be a valid UUID`,
        });
        invalid = true;
      }
    }

    const rawScope = record.scopeType?.trim() ?? '';

    if (!SCOPE_VALUES.has(rawScope)) {
      errors.push({
        row: rowNumber,
        field: 'scopeType',
        message:
          'scopeType must be GLOBAL, REGION, DISTRICT, BRANCH or STAFF',
      });
      invalid = true;
    }

    const rawValue = record.targetValue?.trim() ?? '';

    if (
      !/^(?:\d+)(?:\.\d{1,2})?$/.test(rawValue) ||
      Number(rawValue) <= 0 ||
      !Number.isFinite(Number(rawValue)) ||
      !Number.isSafeInteger(Number(rawValue) * 100)
    ) {
      errors.push({
        row: rowNumber,
        field: 'targetValue',
        message:
          'targetValue must be a positive number with at most two decimal places',
      });
      invalid = true;
    }

    if (invalid) return;

    const scopeType = rawScope as ScopeType;

    const parentAssignmentId =
      record.parentAssignmentId?.trim() || undefined;

    const regionId = record.regionId?.trim() || undefined;
    const districtId = record.districtId?.trim() || undefined;
    const branchId = record.branchId?.trim() || undefined;
    const userId = record.userId?.trim() || undefined;
    const productId = record.productId?.trim() || undefined;

    if (
      scopeType === ScopeType.GLOBAL &&
      parentAssignmentId
    ) {
      errors.push({
        row: rowNumber,
        field: 'parentAssignmentId',
        message: 'GLOBAL assignments cannot have a parent',
      });
      return;
    }

    if (
      scopeType !== ScopeType.GLOBAL &&
      !parentAssignmentId
    ) {
      errors.push({
        row: rowNumber,
        field: 'parentAssignmentId',
        message:
          `${scopeType} assignments require parentAssignmentId`,
      });
      return;
    }

    rows.push({
      rowNumber,
      targetId: record.targetId.trim(),
      scopeType,
      parentAssignmentId,
      regionId,
      districtId,
      branchId,
      userId,
      productId,
      targetValue: Number(rawValue),
    });
  });

  if (records.length === 0) {
    errors.push({
      row: 1,
      message: 'CSV must contain at least one data row',
    });
  }

  return {
    rows,
    errors,
    totalRows: records.length,
  };
}
