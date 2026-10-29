
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service.js';
import { lockStaffActivity } from '../../../database/prisma/staff-activity-lock.js';

import type { Prisma } from '../../../generated/prisma/client.js';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';

import { parseActivityImportCsv } from './activities-import.parser.js';

import type {
  ActivityImportCsvRow,
  ActivityImportError,
  ActivityImportPreview,
  ActivityImportResult,
} from './activities-import.types.js';

type ActivityGroup = {
  date: string;
  rows: ActivityImportCsvRow[];
};

type DatabaseClient = Prisma.TransactionClient | PrismaService;

type StaffContext = {
  branchId: string;
};

const DAILY_FIELDS = [
  'customerVisits',
  'phoneCalls',
  'customersContacted',
  'customersEducated',
  'activations',
  'reactivations',
  'transactions',
] as const;

type DailyField = (typeof DAILY_FIELDS)[number];

@Injectable()
export class ActivitiesImportService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // AUTHORIZATION
  // ============================================================

  private authorize(
    user: AuthenticatedUser,
    branchId: string,
  ): void {
    const allowed = user.roleAssignments?.some(
      (assignment) =>
        assignment.roleCode === 'DIGITAL_RESKILLED_STAFF' &&
        assignment.permissions?.includes('activity.create') === true &&
        (
          (
            assignment.scopeType === 'BRANCH' &&
            assignment.branchId === branchId
          ) ||
          (
            assignment.scopeType === 'STAFF' &&
            (
              assignment.branchId === branchId ||
              (
                assignment.branchId === null &&
                user.id.length > 0
              )
            )
          )
        ),
    );

    if (!allowed) {
      throw new ForbiddenException(
        'You are not authorized to import activities for this branch',
      );
    }
  }

  // ============================================================
  // STAFF AND BRANCH VALIDATION
  // ============================================================

  private async getImportStaffContext(
    user: AuthenticatedUser,
    db: DatabaseClient = this.prisma,
  ): Promise<StaffContext> {
    const staff = await db.user.findFirst({
      where: {
        id: user.id,
        deletedAt: null,
        status: 'ACTIVE',
      },
      include: {
        staffProfile: {
          include: {
            branch: true,
          },
        },
      },
    });

    if (
      !staff?.staffProfile ||
      staff.staffProfile.status !== 'ACTIVE' ||
      !staff.staffProfile.digitalReskilled ||
      staff.staffProfile.branch.deletedAt !== null ||
      staff.staffProfile.branch.status !== 'ACTIVE'
    ) {
      throw new ForbiddenException(
        'An active Digital Reskilled Staff profile and branch are required',
      );
    }

    const branchId = staff.staffProfile.branchId;

    this.authorize(user, branchId);

    return { branchId };
  }

  // ============================================================
  // GROUP CSV ROWS BY ACTIVITY DATE
  // ============================================================

  private groupRows(
    rows: ActivityImportCsvRow[],
  ): ActivityGroup[] {
    const groups = new Map<string, ActivityImportCsvRow[]>();

    for (const row of rows) {
      const existing = groups.get(row.activityDate) ?? [];
      existing.push(row);
      groups.set(row.activityDate, existing);
    }

    return [...groups.entries()].map(([date, groupedRows]) => ({
      date,
      rows: groupedRows,
    }));
  }

  // ============================================================
  // BUSINESS VALIDATION
  // ============================================================

  private validateGroups(
    groups: ActivityGroup[],
  ): ActivityImportError[] {
    const errors: ActivityImportError[] = [];

    for (const group of groups) {
      const first = group.rows[0];

      if (!first) {
        continue;
      }

      const seenProducts = new Set<string>();

      for (const [index, row] of group.rows.entries()) {
        if (seenProducts.has(row.productCode)) {
          errors.push({
            row: 0,
            field: 'productCode',
            message:
              `Duplicate product ${row.productCode} on ${group.date}`,
          });
        }

        seenProducts.add(row.productCode);

        if (index > 0) {
          for (const field of DAILY_FIELDS) {
            if (row[field] !== 0) {
              errors.push({
                row: 0,
                field,
                message:
                  `Daily totals must appear only on the first product row for ${group.date}`,
              });
            }
          }

          if (row.remarks || row.challenges) {
            errors.push({
              row: 0,
              message:
                `Daily remarks and challenges must appear only on the first product row for ${group.date}`,
            });
          }
        }

        if (row.productActivations > row.customersEngaged) {
          errors.push({
            row: 0,
            field: 'productActivations',
            message:
              `Product activations exceed customers engaged for ${row.productCode} on ${group.date}`,
          });
        }

        if (row.productTransactions > row.productActivations) {
          errors.push({
            row: 0,
            field: 'productTransactions',
            message:
              `Product transactions exceed activations for ${row.productCode} on ${group.date}`,
          });
        }
      }

      if (first.customersEducated > first.customersContacted) {
        errors.push({
          row: 0,
          field: 'customersEducated',
          message:
            `Customers educated exceed contacted on ${group.date}`,
        });
      }

      if (first.activations > first.customersEducated) {
        errors.push({
          row: 0,
          field: 'activations',
          message:
            `Activations exceed customers educated on ${group.date}`,
        });
      }

      if (first.transactions > first.activations) {
        errors.push({
          row: 0,
          field: 'transactions',
          message:
            `Transactions exceed activations on ${group.date}`,
        });
      }

      const sum = (
        field:
          | 'productActivations'
          | 'productReactivations'
          | 'productTransactions',
      ): number =>
        group.rows.reduce(
          (total, row) => total + row[field],
          0,
        );

      if (sum('productActivations') !== first.activations) {
        errors.push({
          row: 0,
          field: 'activations',
          message:
            `Product activations do not match daily activations on ${group.date}`,
        });
      }

      if (sum('productReactivations') !== first.reactivations) {
        errors.push({
          row: 0,
          field: 'reactivations',
          message:
            `Product reactivations do not match daily reactivations on ${group.date}`,
        });
      }

      if (sum('productTransactions') !== first.transactions) {
        errors.push({
          row: 0,
          field: 'transactions',
          message:
            `Product transactions do not match daily transactions on ${group.date}`,
        });
      }

      for (const field of DAILY_FIELDS) {
        const value: number = first[field];

        if (!Number.isSafeInteger(value) || value < 0) {
          errors.push({
            row: 0,
            field,
            message:
              `Invalid ${field} value on ${group.date}`,
          });
        }
      }
    }

    return errors;
  }

  // ============================================================
  // PRODUCT VALIDATION
  // ============================================================

  private async getActiveProducts(
    rows: ActivityImportCsvRow[],
    db: DatabaseClient = this.prisma,
  ): Promise<{
    productIds: Map<string, string>;
    errors: ActivityImportError[];
  }> {
    const codes = [
      ...new Set(rows.map((row) => row.productCode)),
    ];

    if (codes.length === 0) {
      return {
        productIds: new Map(),
        errors: [],
      };
    }

    const products = await db.product.findMany({
      where: {
        code: { in: codes },
        status: 'ACTIVE',
        deletedAt: null,
      },
      select: {
        id: true,
        code: true,
      },
    });

    const productIds = new Map(
      products.map((product) => [
        product.code,
        product.id,
      ]),
    );

    const errors: ActivityImportError[] = [];

    for (const code of codes) {
      if (!productIds.has(code)) {
        errors.push({
          row: 0,
          field: 'productCode',
          message:
            `Unknown or inactive product: ${code}`,
        });
      }
    }

    return {
      productIds,
      errors,
    };
  }

  // ============================================================
  // EXISTING ACTIVITIES AND SUBMISSION VALIDATION
  // ============================================================

  private async validateExistingRecords(
    groups: ActivityGroup[],
    userId: string,
    branchId: string,
    db: DatabaseClient = this.prisma,
  ): Promise<ActivityImportError[]> {
    if (groups.length === 0) {
      return [];
    }

    const dates = groups.map(
      (group) =>
        new Date(`${group.date}T00:00:00Z`),
    );

    const [activities, submissions] = await Promise.all([
      db.activity.findMany({
        where: {
          staffId: userId,
          activityDate: { in: dates },
        },
        select: {
          activityDate: true,
        },
      }),

      db.dailySubmission.findMany({
        where: {
          staffId: userId,
          branchId,
          submissionDate: { in: dates },
        },
        select: {
          submissionDate: true,
          status: true,
        },
      }),
    ]);

    const errors: ActivityImportError[] = [];

    for (const activity of activities) {
      const date = activity.activityDate
        .toISOString()
        .slice(0, 10);

      errors.push({
        row: 0,
        field: 'activityDate',
        message:
          `Activity already exists on ${date}`,
      });
    }

    for (const submission of submissions) {
      if (
        submission.status !== 'DRAFT' &&
        submission.status !== 'RETURNED_FOR_CORRECTION'
      ) {
        const date = submission.submissionDate
          .toISOString()
          .slice(0, 10);

        errors.push({
          row: 0,
          field: 'activityDate',
          message:
            `Cannot import activities for locked submission date ${date}`,
        });
      }
    }

    return errors;
  }

  // ============================================================
  // SUMMARY
  // ============================================================

  private buildSummary(
    groups: ActivityGroup[],
  ): ActivityImportPreview['summary'] {
    const summary = {
      customerVisits: 0,
      phoneCalls: 0,
      customersContacted: 0,
      customersEducated: 0,
      activations: 0,
      reactivations: 0,
      transactions: 0,
    };

    for (const group of groups) {
      const first = group.rows[0];

      if (!first) {
        continue;
      }

      for (const field of DAILY_FIELDS) {
        summary[field] += first[field];
      }
    }

    return summary;
  }

  // ============================================================
  // CSV PREVIEW
  // ============================================================

  async preview(
    file: Buffer,
    user: AuthenticatedUser,
  ): Promise<ActivityImportPreview> {
    const staff = await this.getImportStaffContext(user);

    const parsed = parseActivityImportCsv(file);
    const groups = this.groupRows(parsed.rows);

    const errors: ActivityImportError[] = [
      ...parsed.errors,
      ...this.validateGroups(groups),
    ];

    const productCheck = await this.getActiveProducts(
      parsed.rows,
    );

    errors.push(...productCheck.errors);

    errors.push(
      ...await this.validateExistingRecords(
        groups,
        user.id,
        staff.branchId,
      ),
    );

    return {
      valid: errors.length === 0,
      totalRows: parsed.totalRows,
      totalActivities: groups.length,
      totalProductRecords: parsed.rows.length,
      errors,
      summary: this.buildSummary(groups),
    };
  }

  // ============================================================
  // CONFIRM CSV IMPORT
  // ============================================================

  async confirm(
    file: Buffer,
    user: AuthenticatedUser,
  ): Promise<ActivityImportResult> {
    const preview = await this.preview(file, user);

    if (!preview.valid) {
      throw new BadRequestException({
        message: 'CSV validation failed',
        errors: preview.errors,
      });
    }

    const parsed = parseActivityImportCsv(file);
    const groups = this.groupRows(parsed.rows);

    return this.prisma.$transaction(
      async (tx) => {
        // Serialize activity creation for this staff member.
        await lockStaffActivity(tx, user.id);

        // Revalidate authorization and staff/branch status.
        const staff = await this.getImportStaffContext(
          user,
          tx,
        );

        // Revalidate product availability inside transaction.
        const productCheck = await this.getActiveProducts(
          parsed.rows,
          tx,
        );

        if (productCheck.errors.length > 0) {
          throw new BadRequestException({
            message: 'Product validation failed',
            errors: productCheck.errors,
          });
        }

        // Revalidate duplicates and submission status under lock.
        const existingErrors =
          await this.validateExistingRecords(
            groups,
            user.id,
            staff.branchId,
            tx,
          );

        if (existingErrors.length > 0) {
          throw new BadRequestException({
            message: 'Import cannot proceed',
            errors: existingErrors,
          });
        }

        for (const group of groups) {
          const first = group.rows[0];

          if (!first) {
            continue;
          }

          const activityDate = new Date(
            `${group.date}T00:00:00Z`,
          );

          const submission =
            await tx.dailySubmission.findFirst({
              where: {
                staffId: user.id,
                branchId: staff.branchId,
                submissionDate: activityDate,
              },
              select: {
                id: true,
                status: true,
              },
            });

          if (
            submission &&
            submission.status !== 'DRAFT' &&
            submission.status !== 'RETURNED_FOR_CORRECTION'
          ) {
            throw new ForbiddenException(
              `Cannot import for locked submission date ${group.date}`,
            );
          }

          await tx.activity.create({
            data: {
              staffId: user.id,
              branchId: staff.branchId,
              activityDate,
              source: 'IMPORT',
              submissionId: submission?.id,

              customerVisits: first.customerVisits,
              phoneCalls: first.phoneCalls,
              customersContacted: first.customersContacted,
              customersEducated: first.customersEducated,
              activations: first.activations,
              reactivations: first.reactivations,
              transactions: first.transactions,

              remarks: first.remarks,
              challenges: first.challenges,

              products: {
                create: group.rows.map((row) => ({
                  productId:
                    productCheck.productIds.get(
                      row.productCode,
                    )!,

                  customersEngaged: row.customersEngaged,
                  activations: row.productActivations,
                  reactivations: row.productReactivations,
                  transactions: row.productTransactions,
                  failedActivations: row.failedActivations,
                })),
              },
            },
          });
        }

        return {
          success: true,
          importedActivities: groups.length,
          importedProductRecords: parsed.rows.length,
          message:
            'CSV activities imported successfully',
        };
      },
      {
        maxWait: 10000,
        timeout: 30000,
      },
    );
  }
}
