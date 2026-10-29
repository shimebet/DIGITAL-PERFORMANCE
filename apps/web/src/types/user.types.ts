
export type UserStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "LOCKED"
  | "SUSPENDED";

export interface UserOrganization {
  id: string;
  code?: string;
  name: string;
}

export interface UserBranch extends UserOrganization {
  district?: (UserOrganization & {
    region?: UserOrganization | null;
  }) | null;
}

export interface UserStaffProfile {
  branchId: string;
  status: "ACTIVE" | "INACTIVE";
  employeeNumber?: string | null;
  jobTitle?: string | null;
  digitalReskilled?: boolean;
  branch?: UserBranch | null;
}

export interface UserRoleAssignment {
  id: string;
  roleId: string;
  scopeType: string;
  regionId?: string | null;
  districtId?: string | null;
  branchId?: string | null;
  role: {
    id: string;
    code: string;
    name: string;
  };
  region?: UserOrganization | null;
  district?: UserOrganization | null;
  branch?: UserOrganization | null;
}

export interface User {
  id: string;
  username: string;
  email: string | null;
  phone: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string;
  status: UserStatus;
  lastLoginAt?: string | null;
  createdAt: string;
  staffProfile?: UserStaffProfile | null;
  roles?: UserRoleAssignment[];
}

export interface CreateUserPayload {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email?: string;
  phone?: string;
  branchId?: string;
  employeeNumber?: string;
  jobTitle?: string;
  digitalReskilled?: boolean;
}

export interface UpdateUserPayload {
  username?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  status?: UserStatus;
  branchId?: string;
  employeeNumber?: string;
  jobTitle?: string;
}
