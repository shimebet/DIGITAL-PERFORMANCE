
import { apiClient } from './api-client';
import { API_ENDPOINTS } from './endpoints';

export interface TargetImportError {
  row: number;
  field?: string;
  message: string;
}

export interface TargetImportPreview {
  valid: boolean;
  totalRows: number;
  validRows: number;
  errors: TargetImportError[];
  summary: {
    global: number;
    region: number;
    district: number;
    branch: number;
    staff: number;
    totalTargetValue: number;
  };
}

export interface TargetImportResult {
  success: boolean;
  importedAssignments: number;
  message: string;
}

export async function downloadTargetImportTemplate(): Promise<void> {
  const response = await apiClient.get<Blob>(
    API_ENDPOINTS.targetImport.template,
    {
      responseType: 'blob',
    },
  );

  const url = URL.createObjectURL(response.data);

  try {
    const link = document.createElement('a');

    link.href = url;
    link.download = 'target-assignments-template.csv';

    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function uploadTargetCsv<T>(
  endpoint: string,
  file: File,
): Promise<T> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<T>(
    endpoint,
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

export function previewTargetImport(
  file: File,
): Promise<TargetImportPreview> {
  return uploadTargetCsv<TargetImportPreview>(
    API_ENDPOINTS.targetImport.preview,
    file,
  );
}

export function confirmTargetImport(
  file: File,
): Promise<TargetImportResult> {
  return uploadTargetCsv<TargetImportResult>(
    API_ENDPOINTS.targetImport.confirm,
    file,
  );
}
