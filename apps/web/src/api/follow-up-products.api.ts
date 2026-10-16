import { apiClient } from "./api-client";
import { API_ENDPOINTS } from "./endpoints";

export interface FollowUpProductOption {
  id: string;
  name: string;
  status: string;
}

export async function getFollowUpProductsApi(): Promise<
  FollowUpProductOption[]
> {
  const response = await apiClient.get<FollowUpProductOption[]>(
    API_ENDPOINTS.products,
  );

  return response.data.filter(
    (product) => product.status === "ACTIVE",
  );
}
