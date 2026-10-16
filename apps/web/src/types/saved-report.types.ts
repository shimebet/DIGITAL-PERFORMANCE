import type {
  PerformanceReport,
  ReportQuery,
} from './report.types';

export interface SavedReport {
  id: string;
  userId: string;
  name: string;
  reportType: string;
  filters: ReportQuery;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSavedReportInput {
  name: string;
  reportType?: 'PERFORMANCE';
  filters: ReportQuery;
}

export interface UpdateSavedReportInput {
  name?: string;
  filters?: ReportQuery;
}

export type SavedReportRunResult =
  PerformanceReport;
