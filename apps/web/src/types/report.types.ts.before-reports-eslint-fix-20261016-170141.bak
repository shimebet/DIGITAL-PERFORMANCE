import type {
  DailyTrendRow,
  DashboardQuery,
  PerformanceSummary,
  ProductPerformanceRow,
} from './dashboard.types';

export interface ReportQuery
  extends DashboardQuery {}

export interface PerformanceReport {
  generatedAt: string;

  filters:
    ReportQuery;

  summary:
    PerformanceSummary;

  trend:
    DailyTrendRow[];

  products:
    ProductPerformanceRow[];
}