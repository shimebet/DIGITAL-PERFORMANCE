
import type { ScopeType } from '../../../generated/prisma/enums.js';

export const TARGET_ASSIGNMENT_IMPORT_COLUMNS = [
  'targetId',
  'scopeType',
  'parentAssignmentId',
  'regionId',
  'districtId',
  'branchId',
  'userId',
  'productId',
  'targetValue',
] as const;

export interface TargetAssignmentImportRow {
  rowNumber: number;
  targetId: string;
  scopeType: ScopeType;
  parentAssignmentId?: string;
  regionId?: string;
  districtId?: string;
  branchId?: string;
  userId?: string;
  productId?: string;
  targetValue: number;
}

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
