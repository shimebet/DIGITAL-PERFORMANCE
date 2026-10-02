import { apiClient } from './api-client';

export interface HealthResponse {
  success: boolean;
  application: string;
  service: string;
  status: string;
  timestamp: string;
}

export async function getApiHealth() {
  const response =
    await apiClient.get<HealthResponse>('/');

  return response.data;
}