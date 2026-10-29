import { apiClient } from "./api-client";

export interface TargetBulkImportError {
  row: number;
  field?: string;
  message: string;
}

export interface TargetBulkImportPreview {
  valid: boolean;
  totalRows: number;
  validRows: number;
  errors: TargetBulkImportError[];
  summary?: Record<string, unknown>;
}

export interface TargetBulkImportResult {
  success: boolean;
  importedTargets?: number;
  message: string;
}

const BASE = "/targets/bulk-import";

export async function downloadTargetBulkImportTemplate(): Promise<void> {
  const response = await apiClient.get<Blob>(`${BASE}/template`, {
    responseType: "blob",
  });

  const url = URL.createObjectURL(response.data);

  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = "targets-bulk-import-template.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function previewTargetBulkImport(
  file: File,
): Promise<TargetBulkImportPreview> {
  const data = new FormData();
  data.append("file", file);

  const response = await apiClient.post<TargetBulkImportPreview>(
    `${BASE}/preview`,
    data,
    { timeout: 60_000 },
  );

  return response.data;
}

export async function confirmTargetBulkImport(
  file: File,
): Promise<TargetBulkImportResult> {
  const data = new FormData();
  data.append("file", file);

  const response = await apiClient.post<TargetBulkImportResult>(
    `${BASE}/confirm`,
    data,
    { timeout: 60_000 },
  );

  return response.data;
}