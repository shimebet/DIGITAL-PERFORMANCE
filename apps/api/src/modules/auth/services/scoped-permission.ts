
import type {
  AuthenticatedUser,
  AuthenticatedUserRoleAssignment,
} from '../interfaces/authenticated-user.interface.js';

export interface OrganizationalResource {
  regionId: string | null;
  districtId: string | null;
  branchId: string | null;
}

export function assignmentCoversResource(
  assignment: AuthenticatedUserRoleAssignment,
  resource: OrganizationalResource,
): boolean {
  switch (assignment.scopeType) {
    case 'GLOBAL':
      return true;

    case 'REGION':
      return (
        assignment.regionId !== null &&
        assignment.regionId === resource.regionId
      );

    case 'DISTRICT':
      return (
        assignment.districtId !== null &&
        assignment.districtId === resource.districtId
      );

    case 'BRANCH':
      return (
        assignment.branchId !== null &&
        assignment.branchId === resource.branchId
      );

    case 'STAFF':
      return false;

    default:
      return false;
  }
}

export function hasScopedPermission(
  user: AuthenticatedUser,
  permission: string,
  resource: OrganizationalResource,
  allowedRoles?: readonly string[],
): boolean {
  return (
    user.roleAssignments?.some((assignment) => {
      if (!assignment.permissions?.includes(permission)) {
        return false;
      }

      if (
        allowedRoles &&
        !allowedRoles.includes(assignment.roleCode)
      ) {
        return false;
      }

      return assignmentCoversResource(
        assignment,
        resource,
      );
    }) === true
  );
}
