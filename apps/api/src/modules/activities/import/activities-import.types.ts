export const ACTIVITY_IMPORT_COLUMNS = [
  'activityDate',
  'productCode',
  'customerVisits',
  'phoneCalls',
  'customersContacted',
  'customersEducated',
  'customersEngaged',
  'activations',
  'reactivations',
  'transactions',
  'productActivations',
  'productReactivations',
  'productTransactions',
  'failedActivations',
  'remarks',
  'challenges',
] as const;

export type ActivityImportColumn =
  (typeof ACTIVITY_IMPORT_COLUMNS)[number];

export interface ActivityImportCsvRow {
  activityDate: string;
  productCode: string;

  customerVisits: number;
  phoneCalls: number;
  customersContacted: number;
  customersEducated: number;

  customersEngaged: number;

  activations: number;
  reactivations: number;
  transactions: number;

  productActivations: number;
  productReactivations: number;
  productTransactions: number;

  failedActivations: number;

  remarks?: string;
  challenges?: string;
}

export interface ActivityImportError {
  row: number;
  field?: string;
  message: string;
}

export interface ActivityImportPreview {
  valid: boolean;
  totalRows: number;
  totalActivities: number;
  totalProductRecords: number;

  errors: ActivityImportError[];

  summary: {
    customerVisits: number;
    phoneCalls: number;
    customersContacted: number;
    customersEducated: number;
    activations: number;
    reactivations: number;
    transactions: number;
  };
}

export interface ActivityImportResult {
  success: boolean;
  importedActivities: number;
  importedProductRecords: number;
  message: string;
}
