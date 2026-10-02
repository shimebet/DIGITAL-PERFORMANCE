export interface AuthenticatedUserScope {
  scopeType:
    | 'GLOBAL'
    | 'REGION'
    | 'DISTRICT'
    | 'BRANCH'
    | 'STAFF';

  regionId:
    | string
    | null;

  districtId:
    | string
    | null;

  branchId:
    | string
    | null;
}

export interface AuthenticatedUser {
  id: string;

  username: string;

  firstName: string;

  lastName: string;

  roles: string[];

  permissions: string[];

  scopes: AuthenticatedUserScope[];
}