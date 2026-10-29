import { BadRequestException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';

import {
  ACTIVITY_IMPORT_COLUMNS,
  type ActivityImportCsvRow,
  type ActivityImportError,
} from './activities-import.types.js';

export interface ParsedActivityImport {
  rows: ActivityImportCsvRow[];
  errors: ActivityImportError[];
  totalRows: number;
}

const NUMBER_FIELDS = [
  'customerVisits',
  'phoneCalls',
  'customersContacted',
  'customersEducated',
  'customersEngaged',
  'activations',
  'reactivations',
  'transactions',
  'productActivations',
  'productReactivations',
  'productTransactions',
  'failedActivations',
] as const;

const MAX_FILE_BYTES = 1024 * 1024;
const MAX_ROWS = 2000;

export function parseActivityImportCsv(
  file: Buffer,
): ParsedActivityImport {
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
        const expected = [...ACTIVITY_IMPORT_COLUMNS];

        if (
          actual.length !== expected.length ||
          actual.some((header, index) => header !== expected[index])
        ) {
          throw new Error(
            'CSV headers must exactly match the approved template',
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

  const errors: ActivityImportError[] = [];
  const rows: ActivityImportCsvRow[] = [];

  records.forEach((record, index) => {
    const rowNumber = index + 2;
    const values: Record<string, number> = {};
    let invalid = false;

    for (const field of NUMBER_FIELDS) {
      const raw = record[field];

      if (
        raw === undefined ||
        raw === '' ||
        !/^\d+$/.test(raw)
      ) {
        errors.push({
          row: rowNumber,
          field,
          message: `${field} must be a non-negative integer`,
        });
        invalid = true;
        continue;
      }

      const value = Number(raw);

      if (!Number.isSafeInteger(value) || value > 2147483647) {
        errors.push({
          row: rowNumber,
          field,
          message: `${field} exceeds the allowed integer range`,
        });
        invalid = true;
        continue;
      }

      values[field] = value;
    }

    const activityDate = record.activityDate;

    const validDate =
      /^\d{4}-\d{2}-\d{2}$/.test(activityDate ?? '') &&
      !Number.isNaN(Date.parse(`${activityDate}T00:00:00Z`)) &&
      new Date(`${activityDate}T00:00:00Z`)
        .toISOString()
        .slice(0, 10) === activityDate;

    if (!validDate) {
      errors.push({
        row: rowNumber,
        field: 'activityDate',
        message: 'Use a valid date in YYYY-MM-DD format',
      });
      invalid = true;
    }

    if (!record.productCode?.trim()) {
      errors.push({
        row: rowNumber,
        field: 'productCode',
        message: 'Product code is required',
      });
      invalid = true;
    }

    if (invalid) return;

    rows.push({
      activityDate,
      productCode: record.productCode.trim().toUpperCase(),

      customerVisits: values.customerVisits,
      phoneCalls: values.phoneCalls,
      customersContacted: values.customersContacted,
      customersEducated: values.customersEducated,
      customersEngaged: values.customersEngaged,

      activations: values.activations,
      reactivations: values.reactivations,
      transactions: values.transactions,

      productActivations: values.productActivations,
      productReactivations: values.productReactivations,
      productTransactions: values.productTransactions,
      failedActivations: values.failedActivations,

      remarks: record.remarks?.trim() || undefined,
      challenges: record.challenges?.trim() || undefined,
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
