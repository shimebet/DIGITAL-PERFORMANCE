export type ScopeType =
  | 'GLOBAL'
  | 'REGION'
  | 'DISTRICT'
  | 'BRANCH'
  | 'STAFF';

export interface UserScope {
  scopeType: ScopeType;
  regionId: string | null;
  districtId: string | null;
  branchId: string | null;
}

export interface AuthUser {
  id: string;
  username: string;

  firstName: string;
  lastName: string;

  mustChangePassword: boolean;

  roles: string[];
  permissions: string[];
  scopes: UserScope[];
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}