import {
  Injectable,
} from '@nestjs/common';

import ExcelJS from 'exceljs';

import {
  PerformanceService,
} from '../performance/performance.service.js';

import type {
  AuthenticatedUser,
} from '../auth/interfaces/authenticated-user.interface.js';

import {
  ReportQueryDto,
} from './dto/report-query.dto.js';

@Injectable()
export class ReportsService {
  constructor(
    private readonly performanceService:
      PerformanceService,
  ) {}

  async getPerformanceReport(
    query: ReportQueryDto,
    user: AuthenticatedUser,
  ) {
    const summary =
      await this.performanceService.summary(
        query,
        user,
      );

    const trend =
      await this.performanceService.dailyTrend(
        query,
        user,
      );

    const products =
      await this.performanceService.productComparison(
        query,
        user,
      );

    return {
      generatedAt:
        new Date(),

      filters:
        query,

      summary,

      trend,

      products,
    };
  }

  async exportCsv(
    query: ReportQueryDto,
    user: AuthenticatedUser,
  ) {
    const report =
      await this.getPerformanceReport(
        query,
        user,
      );

    const rows = [
      [
        'Date',
        'Customer Visits',
        'Customers Contacted',
        'Customers Educated',
        'Activations',
        'Reactivations',
        'Transactions',
        'Conversion Rate',
        'Transaction Rate',
      ],
    ];

    for (
      const item
      of report.trend
    ) {
      rows.push([
        item.date,
        String(
          item.customerVisits,
        ),
        String(
          item.customersContacted,
        ),
        String(
          item.customersEducated,
        ),
        String(
          item.activations,
        ),
        String(
          item.reactivations,
        ),
        String(
          item.transactions,
        ),
        String(
          item.conversionRate,
        ),
        String(
          item.transactionRate,
        ),
      ]);
    }

    return rows
      .map(
        (row) =>
          row
            .map(
              (value) =>
                `"${String(
                  value,
                ).replace(
                  /"/g,
                  '""',
                )}"`,
            )
            .join(','),
      )
      .join('\n');
  }

  async exportExcel(
    query: ReportQueryDto,
    user: AuthenticatedUser,
  ) {
    const report =
      await this.getPerformanceReport(
        query,
        user,
      );

    const workbook =
      new ExcelJS.Workbook();

    workbook.creator =
      'Digital Performance Monitoring Platform';

    workbook.created =
      new Date();

    // ==========================================================
    // SUMMARY
    // ==========================================================

    const summarySheet =
      workbook.addWorksheet(
        'Summary',
      );

    summarySheet.columns = [
      {
        header:
          'Metric',
        key:
          'metric',
        width:
          30,
      },
      {
        header:
          'Value',
        key:
          'value',
        width:
          25,
      },
    ];

    summarySheet.addRows([
      {
        metric:
          'Target',
        value:
          report.summary.achievement.target,
      },
      {
        metric:
          'Activations',
        value:
          report.summary.activation.activations,
      },
      {
        metric:
          'Reactivations',
        value:
          report.summary.activation.reactivations,
      },
      {
        metric:
          'Transactions',
        value:
          report.summary.transaction.transactions,
      },
      {
        metric:
          'Conversion Rate %',
        value:
          report.summary.conversion.rate,
      },
      {
        metric:
          'Achievement %',
        value:
          report.summary.achievement.percentage,
      },
      {
        metric:
          'Customer Visits',
        value:
          report.summary.activity.customerVisits,
      },
      {
        metric:
          'Customers Contacted',
        value:
          report.summary.activity.customersContacted,
      },
      {
        metric:
          'Customers Educated',
        value:
          report.summary.activity.customersEducated,
      },
    ]);

    // ==========================================================
    // DAILY TREND
    // ==========================================================

    const trendSheet =
      workbook.addWorksheet(
        'Daily Trend',
      );

    trendSheet.columns = [
      {
        header:
          'Date',
        key:
          'date',
        width:
          15,
      },
      {
        header:
          'Visits',
        key:
          'customerVisits',
        width:
          15,
      },
      {
        header:
          'Contacted',
        key:
          'customersContacted',
        width:
          15,
      },
      {
        header:
          'Educated',
        key:
          'customersEducated',
        width:
          15,
      },
      {
        header:
          'Activations',
        key:
          'activations',
        width:
          15,
      },
      {
        header:
          'Reactivations',
        key:
          'reactivations',
        width:
          15,
      },
      {
        header:
          'Transactions',
        key:
          'transactions',
        width:
          15,
      },
      {
        header:
          'Conversion %',
        key:
          'conversionRate',
        width:
          15,
      },
      {
        header:
          'Transaction %',
        key:
          'transactionRate',
        width:
          15,
      },
    ];

    trendSheet.addRows(
      report.trend,
    );

    // ==========================================================
    // PRODUCT PERFORMANCE
    // ==========================================================

    const productSheet =
      workbook.addWorksheet(
        'Products',
      );

    productSheet.columns = [
      {
        header:
          'Product Code',
        key:
          'code',
        width:
          20,
      },
      {
        header:
          'Product',
        key:
          'name',
        width:
          25,
      },
      {
        header:
          'Customers Engaged',
        key:
          'customersEngaged',
        width:
          20,
      },
      {
        header:
          'Activations',
        key:
          'activations',
        width:
          15,
      },
      {
        header:
          'Reactivations',
        key:
          'reactivations',
        width:
          15,
      },
      {
        header:
          'Transactions',
        key:
          'transactions',
        width:
          15,
      },
      {
        header:
          'Conversion %',
        key:
          'conversionRate',
        width:
          15,
      },
      {
        header:
          'Transaction %',
        key:
          'transactionRate',
        width:
          15,
      },
    ];

    productSheet.addRows(
      report.products,
    );

    for (
      const sheet
      of workbook.worksheets
    ) {
      sheet.getRow(
        1,
      ).font = {
        bold:
          true,
      };

      sheet.views = [
        {
          state:
            'frozen',
          ySplit:
            1,
        },
      ];

      sheet.autoFilter = {
        from: {
          row:
            1,
          column:
            1,
        },

        to: {
          row:
            1,
          column:
            sheet.columnCount,
        },
      };
    }

    const buffer =
      await workbook.xlsx.writeBuffer();

    return Buffer.from(
      buffer,
    );
  }
}