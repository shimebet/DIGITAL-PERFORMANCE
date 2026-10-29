
import {
  BadRequestException,
  HttpException,
  Injectable,
} from '@nestjs/common';

import type {
  AuthenticatedUser,
} from '../../auth/interfaces/authenticated-user.interface.js';

import {
  TargetsService,
} from '../targets.service.js';

import type {
  AssignTargetDto,
} from '../dto/assign-target.dto.js';

import {
  parseTargetAssignmentImportCsv,
} from './targets-import.parser.js';

import {
  TargetImportRowError,
} from './target-import-row-error.js';

import type {
  TargetAssignmentImportRow,
  TargetImportError,
  TargetImportPreview,
  TargetImportResult,
} from './targets-import.types.js';

// ============================================================================
// TARGETS CSV IMPORT SERVICE
// ============================================================================

@Injectable()
export class TargetsImportService {
  constructor(
    private readonly targetsService: TargetsService,
  ) {}

  // ==========================================================================
  // CONVERT PARSED CSV ROW TO ASSIGNMENT DTO
  // ==========================================================================

  private toAssignmentDto(
    row: TargetAssignmentImportRow,
  ): AssignTargetDto {
    return {
      targetId: row.targetId,
      scopeType: row.scopeType,
      parentAssignmentId: row.parentAssignmentId,
      regionId: row.regionId,
      districtId: row.districtId,
      branchId: row.branchId,
      userId: row.userId,
      productId: row.productId,
      targetValue: row.targetValue,
    };
  }

  // ==========================================================================
  // EXTRACT ERROR MESSAGE
  // ==========================================================================

  private extractErrorMessage(
    error: HttpException,
  ): string {
    const response = error.getResponse();

    if (typeof response === 'string') {
      return response;
    }

    if (
      typeof response === 'object' &&
      response !== null &&
      'message' in response
    ) {
      const message = response.message;

      if (Array.isArray(message)) {
        return message.map(String).join('; ');
      }

      if (typeof message === 'string') {
        return message;
      }
    }

    return error.message;
  }

  // ==========================================================================
  // CSV PREVIEW WITH DATABASE VALIDATION
  // ==========================================================================

  async preview(
    fileBuffer: Buffer,
    currentUser: AuthenticatedUser,
  ): Promise<TargetImportPreview> {
    const parsed = parseTargetAssignmentImportCsv(
      fileBuffer,
    );

    const errors: TargetImportError[] = [
      ...parsed.errors,
    ];

    const summary = {
      global: 0,
      region: 0,
      district: 0,
      branch: 0,
      staff: 0,
      totalTargetValue: 0,
    };

    // ------------------------------------------------------------------------
    // BUILD PREVIEW SUMMARY
    // ------------------------------------------------------------------------

    for (const row of parsed.rows) {
      switch (row.scopeType) {
        case 'GLOBAL':
          summary.global++;
          break;

        case 'REGION':
          summary.region++;
          break;

        case 'DISTRICT':
          summary.district++;
          break;

        case 'BRANCH':
          summary.branch++;
          break;

        case 'STAFF':
          summary.staff++;
          break;
      }

      summary.totalTargetValue += row.targetValue;
    }

    // ------------------------------------------------------------------------
    // DATABASE-AWARE VALIDATION
    // ------------------------------------------------------------------------

    if (
      errors.length === 0 &&
      parsed.rows.length > 0
    ) {
      // Preserve row numbers for future row-aware
      // validation in TargetsService.
      //
      // The current TargetsService signature accepts
      // AssignTargetDto[], so this remains compatible.

      const assignments = parsed.rows.map(
        (row) => ({
          ...this.toAssignmentDto(row),
          rowNumber: row.rowNumber,
        }),
      );

      try {
        await this.targetsService.validateBatchPreview(
          assignments,
          currentUser,
        );
      } catch (error: unknown) {
        // --------------------------------------------------------------------
        // ROW-SPECIFIC VALIDATION ERROR
        // --------------------------------------------------------------------

        if (error instanceof TargetImportRowError) {
          errors.push({
            row: error.row,
            field: error.field,
            message: error.message,
          });
        }

        // --------------------------------------------------------------------
        // GENERAL DATABASE VALIDATION ERROR
        // --------------------------------------------------------------------

        else if (error instanceof HttpException) {
          // Authorization failures must remain HTTP 403,
          // not be presented as ordinary CSV validation.
          if (error.getStatus() === 401 ||
              error.getStatus() === 403) {
            throw error;
          }

          errors.push({
            row: 0,
            message: this.extractErrorMessage(error),
          });
        }

        // --------------------------------------------------------------------
        // UNEXPECTED DATABASE / SYSTEM FAILURE
        // --------------------------------------------------------------------

        else {
          throw error;
        }
      }
    }

    // ------------------------------------------------------------------------
    // FINAL PREVIEW RESPONSE
    // ------------------------------------------------------------------------

    return {
      valid: errors.length === 0,
      totalRows: parsed.totalRows,
      validRows:
        errors.length === 0
          ? parsed.rows.length
          : 0,
      errors,
      summary: {
        ...summary,
        totalTargetValue:
          Math.round(
            summary.totalTargetValue * 100,
          ) / 100,
      },
    };
  }

  // ==========================================================================
  // CSV CONFIRMATION
  // ==========================================================================

  async confirm(
    fileBuffer: Buffer,
    currentUser: AuthenticatedUser,
  ): Promise<TargetImportResult> {
    const parsed = parseTargetAssignmentImportCsv(
      fileBuffer,
    );

    // ------------------------------------------------------------------------
    // STRUCTURAL CSV VALIDATION
    // ------------------------------------------------------------------------

    if (
      parsed.errors.length > 0 ||
      parsed.rows.length === 0
    ) {
      throw new BadRequestException({
        message:
          'CSV validation failed. No target assignments were imported.',
        errors: parsed.errors,
      });
    }

    // ------------------------------------------------------------------------
    // BUILD BATCH WITH ORIGINAL CSV ROW NUMBERS
    // ------------------------------------------------------------------------

    const assignments = parsed.rows.map(
      (row) => ({
        ...this.toAssignmentDto(row),
        rowNumber: row.rowNumber,
      }),
    );

    // ------------------------------------------------------------------------
    // ATOMIC DATABASE IMPORT
    // ------------------------------------------------------------------------

    // assignBatch performs:
    // - Authorization checks
    // - Organizational scope validation
    // - Parent-child hierarchy validation
    // - Parent capacity validation
    // - Duplicate assignment detection
    // - Overlapping target detection
    //
    // Any failure rolls back the entire transaction.

    const result =
      await this.targetsService.assignBatch(
        assignments,
        currentUser,
      );

    return {
      success: true,
      importedAssignments:
        result.importedAssignments,
      message:
        `${result.importedAssignments} target assignments imported successfully`,
    };
  }
}
