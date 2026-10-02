import {
  Controller,
  Get,
  Query,
  Res,
} from '@nestjs/common';

import type {
  Response,
} from 'express';

import {
  ReportsService,
} from './reports.service.js';

import {
  ReportQueryDto,
} from './dto/report-query.dto.js';

import {
  CurrentUser,
} from '../auth/decorators/current-user.decorator.js';

import {
  Permissions,
} from '../auth/decorators/permissions.decorator.js';

import type {
  AuthenticatedUser,
} from '../auth/interfaces/authenticated-user.interface.js';

@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService:
      ReportsService,
  ) {}

  @Get('performance')
  @Permissions('report.read')
  getPerformance(
    @Query()
    query: ReportQueryDto,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.reportsService.getPerformanceReport(
      query,
      user,
    );
  }

  @Get('performance/csv')
  @Permissions('report.export')
  async exportCsv(
    @Query()
    query: ReportQueryDto,

    @CurrentUser()
    user: AuthenticatedUser,

    @Res()
    response: Response,
  ) {
    const csv =
      await this.reportsService.exportCsv(
        query,
        user,
      );

    response.setHeader(
      'Content-Type',
      'text/csv; charset=utf-8',
    );

    response.setHeader(
      'Content-Disposition',
      'attachment; filename="performance-report.csv"',
    );

    response.send(
      csv,
    );
  }

  @Get('performance/xlsx')
  @Permissions('report.export')
  async exportExcel(
    @Query()
    query: ReportQueryDto,

    @CurrentUser()
    user: AuthenticatedUser,

    @Res()
    response: Response,
  ) {
    const file =
      await this.reportsService.exportExcel(
        query,
        user,
      );

    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    response.setHeader(
      'Content-Disposition',
      'attachment; filename="performance-report.xlsx"',
    );

    response.send(
      file,
    );
  }
}