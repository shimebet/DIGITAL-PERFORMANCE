export type ScopeType =
  | 'GLOBAL'
  | 'REGION'
  | 'DISTRICT'
  | 'BRANCH'
  | 'STAFF';

export interface UserScope {
  scopeType: ScopeType;

  regionId:
    string | null;

  regionName?:
    string | null;

  districtId:
    string | null;

  districtName?:
    string | null;

  branchId:
    string | null;

  branchName?:
    string | null;
}

export interface AuthRoleAssignment {
  roleCode: string;
  scopeType: ScopeType;
  regionId: string | null;
  districtId: string | null;
  branchId: string | null;
}

export interface AuthUser {
  roleAssignments?: AuthRoleAssignment[];
  id:
    string;

  username:
    string;

  email:
    string | null;

  phone:
    string | null;

  firstName:
    string;

  middleName:
    string | null;

  lastName:
    string;

  status?:
    string;

  employeeNumber?:
    string | null;

  jobTitle?:
    string | null;

  mustChangePassword:
    boolean;

  roles:
    string[];

  permissions:
    string[];

  scopes:
    UserScope[];
}

export interface LoginRequest {
  username:
    string;

  password:
    string;
}

export interface LoginResponse {
  accessToken:
    string;

  refreshToken:
    string;

  user:
    AuthUser;
}

export interface RefreshRequest {
  refreshToken:
    string;
}

export interface RefreshResponse {
  accessToken:
    string;

  refreshToken:
    string;

  user:
    AuthUser;
}

export interface ChangePasswordRequest {
  currentPassword:
    string;

  newPassword:
    string;
}

export interface UpdateMyProfileRequest {
  firstName?:
    string;

  middleName?:
    string | null;

  lastName?:
    string;

  email?:
    string | null;

  phone?:
    string | null;
}