import { apiClient } from "./api-client";
import { API_ENDPOINTS } from "./endpoints";

import type {
  Product,
  ProductDetails,
  CreateProductRequest,
  UpdateProductRequest,
} from "../types/product.types";

const baseUrl = API_ENDPOINTS.products;

export async function getProductsApi(
  includeInactive = false,
): Promise<Product[]> {
  const response = await apiClient.get<Product[]>(
    baseUrl,
    {
      params: {
        includeInactive,
      },
    },
  );

  return response.data;
}

export async function getProductApi(
  id: string,
): Promise<ProductDetails> {
  const response = await apiClient.get<ProductDetails>(
    `${baseUrl}/${encodeURIComponent(id)}`,
  );

  return response.data;
}

export async function createProductApi(
  payload: CreateProductRequest,
): Promise<Product> {
  const response = await apiClient.post<Product>(
    baseUrl,
    payload,
  );

  return response.data;
}

export async function updateProductApi(
  id: string,
  payload: UpdateProductRequest,
): Promise<Product> {
  const response = await apiClient.patch<Product>(
    `${baseUrl}/${encodeURIComponent(id)}`,
    payload,
  );

  return response.data;
}

export async function removeProductApi(
  id: string,
): Promise<Product> {
  const response = await apiClient.delete<Product>(
    `${baseUrl}/${encodeURIComponent(id)}`,
  );

  return response.data;
}