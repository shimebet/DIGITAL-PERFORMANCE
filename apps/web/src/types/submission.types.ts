import type { Activity } from "./activity.types";

export type SubmissionStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "RESUBMITTED"
  | "REVIEWED"
  | "APPROVED"
  | "RETURNED_FOR_CORRECTION";

export interface SubmissionRegion {
  id: string;
  code: string;
  name: string;
}

export interface SubmissionDistrict {
  id: string;
  code: string;
  name: string;

  regionId?: string;

  region?: SubmissionRegion;
}

export interface SubmissionBranch {
  id: string;
  code: string;
  name: string;

  districtId?: string;

  district?: SubmissionDistrict;
}

export interface SubmissionStaff {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
}

export interface DailySubmission {
  id: string;

  staffId: string;
  branchId: string;

  submissionDate: string;

  status: SubmissionStatus;

  remarks?: string | null;

  returnReason?: string | null;

  submittedAt?: string | null;

  reviewedAt?: string | null;

  approvedAt?: string | null;

  approvedByUserId?: string | null;

  version: number;

  createdAt: string;
  updatedAt: string;

  branch?: SubmissionBranch;

  staff?: SubmissionStaff;

  activities: Activity[];
}

export interface CreateSubmissionRequest {
  submissionDate: string;

  remarks?: string;
}

export interface ReturnSubmissionRequest {
  reason: string;
}

export interface SubmissionQuery {
  regionId?: string;

  districtId?: string;

  branchId?: string;

  staffId?: string;

  status?: SubmissionStatus | "";

  startDate?: string;

  endDate?: string;
}
