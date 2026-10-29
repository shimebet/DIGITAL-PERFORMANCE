
import { apiClient } from './api-client';
import { API_ENDPOINTS } from './endpoints';

// ============================================================
// TYPES
// ============================================================

export interface ActivityImportError {
  row: number;
  field?: string;
  message: string;
}

export interface ActivityImportSummary {
  customerVisits: number;
  phoneCalls: number;
  customersContacted: number;
  customersEducated: number;
  activations: number;
  reactivations: number;
  transactions: number;
}

export interface ActivityImportPreview {
  valid: boolean;
  totalRows: number;
  totalActivities: number;
  totalProductRecords: number;
  errors: ActivityImportError[];
  summary: ActivityImportSummary;
}

export interface ActivityImportResult {
  success: boolean;
  importedActivities: number;
  importedProductRecords: number;
  message: string;
}

// ============================================================
// DOWNLOAD CSV TEMPLATE
// ============================================================

export async function downloadActivityImportTemplate(): Promise<void> {
  const response = await apiClient.get<Blob>(
    API_ENDPOINTS.activityImport.template,
    {
      responseType: 'blob',
    },
  );

  const url = URL.createObjectURL(response.data);

  try {
    const link = document.createElement('a');

    link.href = url;
    link.download = 'activities-import-template.csv';

    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ============================================================
// PREVIEW CSV - NO DATABASE WRITES
// ============================================================

export async function previewActivityImport(
  file: File,
): Promise<ActivityImportPreview> {
  const formData = new FormData();

  formData.append('file', file);

  const response = await apiClient.post<ActivityImportPreview>(
    API_ENDPOINTS.activityImport.preview,
    formData,
    {
      headers: {
        'Content-Type': undefined,
      },
    },
  );

  return response.data;
}

// ============================================================
// CONFIRM CSV - DATABASE TRANSACTION
// ============================================================

export async function confirmActivityImport(
  file: File,
): Promise<ActivityImportResult> {
  const formData = new FormData();

  formData.append('file', file);

  const response = await apiClient.post<ActivityImportResult>(
    API_ENDPOINTS.activityImport.confirm,
    formData,
    {
      headers: {
        'Content-Type': undefined,
      },
      timeout: 60_000,
    },
  );

  return response.data;
}
