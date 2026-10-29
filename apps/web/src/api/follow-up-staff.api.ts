import { apiClient } from "./api-client";
import { API_ENDPOINTS } from "./endpoints";

export interface FollowUpStaffOption {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  status: string;

  staffProfile: {
    branchId: string;
    status: string;
    branch: {
      name: string;
    };
  } | null;
}

export async function getFollowUpStaffApi(): Promise<
  FollowUpStaffOption[]
> {
  const response = await apiClient.get<
    FollowUpStaffOption[]
  >(
    `${API_ENDPOINTS.followUps}/eligible-staff`,
  );

  return response.data;
}