import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  PrismaService,
} from '../../database/prisma/prisma.service.js';

import type {
  AuthenticatedUser,
} from '../auth/interfaces/authenticated-user.interface.js';

import {
  CreateSavedReportDto,
} from './dto/create-saved-report.dto.js';

import {
  UpdateSavedReportDto,
} from './dto/update-saved-report.dto.js';
import {
  PerformanceService,
} from '../performance/performance.service.js';

import {
  ReportsService,
} from './reports.service.js';

import {
  BadRequestException,
} from '@nestjs/common';

import {
  ReportQueryDto,
} from './dto/report-query.dto.js';
import {
  ReportAuditService,
} from './report-audit.service.js';






@Injectable()
export class SavedReportsService {
constructor(
  private readonly prisma: PrismaService,
  private readonly performanceService: PerformanceService,
  private readonly reportsService: ReportsService,
  private readonly reportAuditService: ReportAuditService,
) {}

async create(
  dto: CreateSavedReportDto,
  user: AuthenticatedUser,
) {
  await this.performanceService.validateReportAccess(
    dto.filters,
    user,
  );

  return this.prisma.savedReport.create({
      data: {
        userId: user.id,
        name: dto.name.trim(),
        reportType: 'PERFORMANCE',
        filters: { ...dto.filters },
      },
    });
  }

  async findAll(
    user: AuthenticatedUser,
  ) {
    return this.prisma.savedReport.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async findOne(
    id: string,
    user: AuthenticatedUser,
  ) {
    const report =
      await this.prisma.savedReport.findFirst({
        where: {
          id,
          userId: user.id,
        },
      });

    if (!report) {
      throw new NotFoundException(
        'Saved report not found',
      );
    }

    return report;
  }

  async update(
    id: string,
    dto: UpdateSavedReportDto,
    user: AuthenticatedUser,
  ) {
await this.findOne(id, user);

if (dto.filters !== undefined) {
  await this.performanceService.validateReportAccess(
    dto.filters,
    user,
  );
}

const result =
  await this.prisma.savedReport.updateMany({
        where: {
          id,
          userId: user.id,
        },
        data: {
          ...(dto.name !== undefined
            ? { name: dto.name.trim() }
            : {}),
          ...(dto.filters !== undefined
            ? { filters: { ...dto.filters } }
            : {}),
        },
      });

    if (result.count === 0) {
      throw new NotFoundException(
        'Saved report not found',
      );
    }

    return this.findOne(id, user);
  }
async run(
  id: string,
  user: AuthenticatedUser,
) {
  // Only the owner can access this saved report.
  const savedReport = await this.findOne(
    id,
    user,
  );

  if (savedReport.reportType !== 'PERFORMANCE') {
    throw new BadRequestException(
      'Unsupported saved report type',
    );
  }

  // Execute through the existing reporting service.
  // Its performance queries recheck current user scope.
 const filters =
  savedReport.filters as ReportQueryDto;

const report =
  await this.reportsService.getPerformanceReport(
    filters,
    user,
    false,
  );

await this.reportAuditService.recordReport(
  user,
  filters,
  'SAVED',
  savedReport.id,
);

return report;
}
  async remove(
    id: string,
    user: AuthenticatedUser,
  ) {
    const result =
      await this.prisma.savedReport.deleteMany({
        where: {
          id,
          userId: user.id,
        },
      });

    if (result.count === 0) {
      throw new NotFoundException(
        'Saved report not found',
      );
    }

    return {
      success: true,
    };
  }
}
