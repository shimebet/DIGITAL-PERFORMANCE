export interface ActivityProduct {
  id?: string;

  productId: string;

  product?: {
    id: string;
    code: string;
    name: string;
  };

  customersEngaged: number;
  activations: number;
  reactivations: number;
  transactions: number;
  failedActivations?: number;

  remarks?: string | null;
}

export interface ActivityBranch {
  id: string;
  code: string;
  name: string;
}

export interface ActivitySubmission {
  id: string;
  status: string;
  submissionDate?: string;
}

export interface Activity {
  id: string;

  submissionId?: string | null;

  staffId: string;
  branchId: string;

  activityDate: string;

  source?: string;

  customerVisits: number;
  phoneCalls: number;
  customersContacted: number;
  customersEducated: number;

  activations: number;
  reactivations: number;
  transactions: number;

  followUpsCreated?: number;

  remarks?: string | null;
  challenges?: string | null;

  branch?: ActivityBranch;

  products: ActivityProduct[];

  submission?: ActivitySubmission | null;

  createdAt: string;
  updatedAt: string;
}

export interface ActivityProductRequest {
  productId: string;

  customersEngaged: number;
  activations: number;
  reactivations: number;
  transactions: number;

  failedActivations?: number;

  remarks?: string;
}

export interface CreateActivityRequest {
  activityDate: string;

  customerVisits: number;
  phoneCalls: number;
  customersContacted: number;
  customersEducated: number;

  activations: number;
  reactivations: number;
  transactions: number;

  remarks?: string;
  challenges?: string;

  products: ActivityProductRequest[];
}

export interface UpdateActivityRequest {
  customerVisits?: number;
  phoneCalls?: number;
  customersContacted?: number;
  customersEducated?: number;

  activations?: number;
  reactivations?: number;
  transactions?: number;

  remarks?: string;
  challenges?: string;

  products?: ActivityProductRequest[];
}