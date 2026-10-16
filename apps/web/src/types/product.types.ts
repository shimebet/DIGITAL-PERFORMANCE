export type ProductStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "ARCHIVED";

export interface Product {
  id: string;
  code: string;
  name: string;
  category: string | null;
  description: string | null;
  status: ProductStatus;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ProductUsageCounts {
  activityProducts: number;
  targetAssignments: number;
  followUps: number;
}

export interface ProductDetails extends Product {
  _count: ProductUsageCounts;
}

export interface CreateProductRequest {
  code: string;
  name: string;
  category?: string;
  description?: string;
  displayOrder?: number;
}

export interface UpdateProductRequest {
  name?: string;
  category?: string;
  description?: string;
  displayOrder?: number;
  status?: ProductStatus;
}