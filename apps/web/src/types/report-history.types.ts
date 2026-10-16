
export type ReportHistoryFormat =
  | 'JSON'
  | 'CSV'
  | 'XLSX'
  | 'SAVED';

export type ReportHistoryAction =
  | 'READ'
  | 'EXPORT';

export interface ReportHistoryFilters {
  startDate?: string;
  endDate?: string;
  regionId?: string;
  districtId?: string;
  branchId?: string;
  staffId?: string;
  productId?: string;
}

export interface ReportHistoryMetadata {
  reportType?: string;
  format?: ReportHistoryFormat;
  filters?: ReportHistoryFilters;
  savedReportId?: string;
}

export interface ReportHistoryEntry {
  id: string;
  action: ReportHistoryAction;
  description: string | null;
  entityId: string | null;
  newValue: ReportHistoryMetadata | null;
  createdAt: string;
}
