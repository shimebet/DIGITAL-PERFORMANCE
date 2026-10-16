import {
  Injectable,
} from '@nestjs/common';

import {
  AuditAction,
} from '../../generated/prisma/enums.js';

import {
  PrismaService,
} from '../../database/prisma/prisma.service.js';

import type {
  AuthenticatedUser,
} from '../auth/interfaces/authenticated-user.interface.js';

import type {
  ReportQueryDto,
} from './dto/report-query.dto.js';

type ReportAuditFormat =
  | 'JSON'
  | 'CSV'
  | 'XLSX'
  | 'SAVED';

@Injectable()
export class ReportAuditService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async recordReport(
    user: AuthenticatedUser,
    query: ReportQueryDto,
    format: ReportAuditFormat,
    savedReportId?: string,
  ): Promise<void> {
    const filters = {
      ...(query.startDate
        ? { startDate: query.startDate }
        : {}),
      ...(query.endDate
        ? { endDate: query.endDate }
        : {}),
      ...(query.regionId
        ? { regionId: query.regionId }
        : {}),
      ...(query.districtId
        ? { districtId: query.districtId }
        : {}),
      ...(query.branchId
        ? { branchId: query.branchId }
        : {}),
      ...(query.staffId
        ? { staffId: query.staffId }
        : {}),
      ...(query.productId
        ? { productId: query.productId }
        : {}),
    };

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action:
          format === 'CSV' || format === 'XLSX'
            ? AuditAction.EXPORT
            : AuditAction.READ,
        module: 'REPORTS',
        entityType: 'PERFORMANCE_REPORT',
        entityId: savedReportId ?? undefined,
        description:
          format === 'SAVED'
            ? 'Executed saved performance report'
            : `Generated performance report (${format})`,
        newValue: {
          reportType: 'PERFORMANCE',
          format,
          filters,
          ...(savedReportId
            ? { savedReportId }
            : {}),
        },
      },
    });
  }

  async findMyHistory(
    user: AuthenticatedUser,
    limit = 50,
  ) {
    const safeLimit = Math.min(
      Math.max(limit, 1),
      100,
    );

    return this.prisma.auditLog.findMany({
      where: {
        userId: user.id,
        module: 'REPORTS',
        entityType: 'PERFORMANCE_REPORT',
        action: {
          in: [
            AuditAction.READ,
            AuditAction.EXPORT,
          ],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: safeLimit,
      select: {
        id: true,
        action: true,
        description: true,
        entityId: true,
        newValue: true,
        createdAt: true,
      },
    });
  }
}

