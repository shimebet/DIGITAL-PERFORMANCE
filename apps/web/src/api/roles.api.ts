import { apiClient } from "./api-client";
import { API_ENDPOINTS } from "./endpoints";

export interface RoleOption {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  status?: string;
  isSystemRole?: boolean;
  _count?: {
    userRoles: number;
    rolePermissions: number;
  };
}

export async function getRolesApi(): Promise<RoleOption[]> {
  const response = await apiClient.get<RoleOption[]>(API_ENDPOINTS.roles);
  return response.data;
}

export async function getRoleApi(id: string): Promise<RoleOption> {
  const response = await apiClient.get<RoleOption>(
    `${API_ENDPOINTS.roles}/${encodeURIComponent(id)}`,
  );
  return response.data;
}
