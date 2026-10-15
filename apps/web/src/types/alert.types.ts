export type AlertSeverity =
  | 'INFO'
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL';

export type AlertStatus =
  | 'OPEN'
  | 'ACKNOWLEDGED'
  | 'RESOLVED'
  | 'DISMISSED';

export type AlertScopeType =
  | 'GLOBAL'
  | 'REGION'
  | 'DISTRICT'
  | 'BRANCH'
  | 'STAFF';

export interface AlertQuery {
  status?: AlertStatus;

  severity?: AlertSeverity;

  regionId?: string;

  districtId?: string;

  branchId?: string;

  productId?: string;

  startDate?: string;

  endDate?: string;
}

export interface AlertRegion {
  id: string;

  code: string;

  name: string;
}

export interface AlertDistrict {
  id: string;

  regionId: string;

  code: string;

  name: string;
}

export interface AlertBranch {
  id: string;

  districtId: string;

  code: string;

  name: string;
}

export interface AlertProduct {
  id: string;

  code: string;

  name: string;
}

export interface AlertRecipient {
  id: string;

  username: string;

  firstName: string;

  middleName: string | null;

  lastName: string;
}

export interface AlertRecord {
  id: string;

  title: string;

  message: string;

  severity:
    AlertSeverity;

  status:
    AlertStatus;

  alertType:
    string;

  scopeType:
    AlertScopeType;

  regionId:
    string | null;

  districtId:
    string | null;

  branchId:
    string | null;

  productId:
    string | null;

  recipientUserId:
    string | null;

  detectedAt:
    string;

  acknowledgedAt:
    string | null;

  resolvedAt:
    string | null;

  metadata:
    | Record<
        string,
        unknown
      >
    | null;

  createdAt:
    string;

  updatedAt:
    string;

  region:
    | AlertRegion
    | null;

  district:
    | AlertDistrict
    | null;

  branch:
    | AlertBranch
    | null;

  product:
    | AlertProduct
    | null;

  recipient:
    | AlertRecipient
    | null;
}

export interface AlertDetectionResult {
  missedSubmissions:
    number;

  lowConversion:
    number;

  overdueFollowUps:
    number;
}