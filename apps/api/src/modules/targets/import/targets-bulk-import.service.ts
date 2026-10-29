
import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';
import { CreateTargetDto } from '../dto/create-target.dto.js';

const COLUMNS = [
  'name',
  'description',
  'metricType',
  'periodType',
  'startDate',
  'endDate',
  'defaultTargetValue',
] as const;

const MAX_FILE_SIZE = 1024 * 1024;
const MAX_ROWS = 2000;

type ImportError = {
  row: number;
  field?: string;
  message: string;
};

type ParsedRow = {
  row: number;
  dto: CreateTargetDto;
};

@Injectable()
export class TargetsBulkImportService {
  constructor(private readonly prisma: PrismaService) {}

  getTemplate(): string {
    return '\uFEFF' + COLUMNS.join(',') + '\r\n';
  }

  private parseAndValidate(buffer: Buffer): {
    totalRows: number;
    rows: ParsedRow[];
    errors: ImportError[];
  } {
    if (!buffer.length) {
      throw new BadRequestException('CSV file is empty');
    }

    if (buffer.length > MAX_FILE_SIZE) {
      throw new BadRequestException('Maximum CSV file size is 1 MB');
    }

    let records: Record<string, string>[];

    try {
      records = parse(buffer.toString('utf8'), {
        bom: true,
        columns: (headers: string[]) => {
          const valid =
            headers.length === COLUMNS.length &&
            COLUMNS.every((column, index) => headers[index] === column);

          if (!valid) {
            throw new Error(
              `CSV headers must be exactly: ${COLUMNS.join(',')}`,
            );
          }

          return headers;
        },
        skip_empty_lines: true,
        trim: true,
        relax_quotes: false,
      });
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid CSV format',
      );
    }

    if (records.length === 0) {
      throw new BadRequestException('CSV must contain at least one data row');
    }

    if (records.length > MAX_ROWS) {
      throw new BadRequestException(
        `Maximum ${MAX_ROWS} targets per import`,
      );
    }

    const rows: ParsedRow[] = [];
    const errors: ImportError[] = [];

    records.forEach((record, index) => {
      const rowNumber = index + 2;
      const rawValue = record.defaultTargetValue?.trim() ?? '';

      const dto = plainToInstance(CreateTargetDto, {
        name: record.name,
        description: record.description || undefined,
        metricType: record.metricType,
        periodType: record.periodType,
        startDate: record.startDate,
        endDate: record.endDate,
        defaultTargetValue:
          rawValue === '' ? undefined : Number(rawValue),
      });

      const validationErrors = validateSync(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });

      for (const validationError of validationErrors) {
        for (const message of Object.values(
          validationError.constraints ?? {},
        )) {
          errors.push({
            row: rowNumber,
            field: validationError.property,
            message,
          });
        }
      }

      if (
        !Number.isFinite(Date.parse(dto.startDate)) ||
        !Number.isFinite(Date.parse(dto.endDate))
      ) {
        errors.push({
          row: rowNumber,
          field: 'startDate/endDate',
          message: 'Dates must be valid ISO dates',
        });
      } else if (
        new Date(dto.endDate) < new Date(dto.startDate)
      ) {
        errors.push({
          row: rowNumber,
          field: 'endDate',
          message: 'End date must be on or after start date',
        });
      }

      if (validationErrors.length === 0 &&
          !errors.some((error) => error.row === rowNumber)) {
        rows.push({ row: rowNumber, dto });
      }
    });

    return {
      totalRows: records.length,
      rows,
      errors,
    };
  }

  preview(buffer: Buffer) {
    const result = this.parseAndValidate(buffer);

    const metrics: Record<string, number> = {};

    for (const { dto } of result.rows) {
      metrics[dto.metricType] =
        (metrics[dto.metricType] ?? 0) + 1;
    }

    return {
      valid: result.errors.length === 0,
      totalRows: result.totalRows,
      validRows: result.rows.length,
      errors: result.errors,
      summary: {
        metrics,
        totalDefaultTargetValue: result.rows.reduce(
          (sum, { dto }) => sum + (dto.defaultTargetValue ?? 0),
          0,
        ),
      },
    };
  }

  async confirm(buffer: Buffer, user: AuthenticatedUser) {
    const result = this.parseAndValidate(buffer);

    if (result.errors.length > 0) {
      throw new BadRequestException({
        message: 'CSV validation failed',
        errors: result.errors,
      });
    }

    const created = await this.prisma.$transaction(
      async (tx) => {
        const targets = [];

        for (const { dto } of result.rows) {
          const target = await tx.target.create({
            data: {
              name: dto.name.trim(),
              description: dto.description?.trim(),
              metricType: dto.metricType,
              periodType: dto.periodType,
              startDate: new Date(dto.startDate),
              endDate: new Date(dto.endDate),
              defaultTargetValue: dto.defaultTargetValue,
              createdByUserId: user.id,
            },
          });

          targets.push(target);
        }

        return targets;
      },
      {
        maxWait: 10000,
        timeout: 60000,
      },
    );

    return {
      success: true,
      importedTargets: created.length,
      message: `${created.length} targets imported successfully`,
    };
  }
}
