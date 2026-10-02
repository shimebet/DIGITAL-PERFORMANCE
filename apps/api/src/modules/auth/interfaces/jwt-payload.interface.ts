export interface JwtPayload {
  sub: string;

  username: string;

  roles: string[];

  permissions: string[];

  scopes?: Array<{
    scopeType: string;
    regionId?: string | null;
    districtId?: string | null;
    branchId?: string | null;
  }>;
}