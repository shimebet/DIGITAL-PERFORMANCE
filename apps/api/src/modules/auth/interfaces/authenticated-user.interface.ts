
export type AuthenticatedScopeType =
  | 'GLOBAL'
  | 'REGION'
  | 'DISTRICT'
  | 'BRANCH'
  | 'STAFF';

export interface AuthenticatedUserScope {
  scopeType: AuthenticatedScopeType;

  regionId: string | null;

  districtId: string | null;

  branchId: string | null;
}

export interface AuthenticatedUserRoleAssignment
  extends AuthenticatedUserScope {
  roleCode: string;

  /**
   * Active permissions granted by this specific role.
   * Authorization must use permissions and scope
   * from the same assignment.
   */
  permissions?: string[];
}

export interface AuthenticatedUser {
  id: string;

  username: string;

  firstName: string;

  lastName: string;

  roles: string[];

  permissions: string[];

  scopes: AuthenticatedUserScope[];
  mustChangePassword: boolean;

  /**
   * Keeps each role associated with its actual scope.
   *
   * Optional temporarily for compatibility with
   * existing tests and manually constructed fixtures.
   *
   * Authorization-sensitive operations must fail
   * closed when roleAssignments is absent.
   */
  roleAssignments?: AuthenticatedUserRoleAssignment[];
}


