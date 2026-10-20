import type {
  AuthenticatedUser,
} from '../../auth/interfaces/authenticated-user.interface.js';

export interface SubmissionOrganization {
  branchId: string;
  districtId: string;
  regionId: string;
}

export type SubmissionManagerPermission =
  | 'submission.review'
  | 'submission.approve';

export function canManageSubmission(
  user: AuthenticatedUser,
  permission: SubmissionManagerPermission,
  organization: SubmissionOrganization,
): boolean {
  if (
    !organization.branchId ||
    !organization.districtId ||
    !organization.regionId
  ) {
    return false;
  }

  return user.roleAssignments?.some((assignment) => {
    // Missing assignment permissions must never authorize an action.
    if (!Array.isArray(assignment.permissions)) {
      return false;
    }

    // Global SUPER_ADMIN is an explicit administrative exception.
    if (
      assignment.roleCode === 'SUPER_ADMIN' &&
      assignment.scopeType === 'GLOBAL'
    ) {
      return true;
    }

    if (!assignment.permissions.includes(permission)) {
      return false;
    }

    switch (assignment.scopeType) {
      case 'GLOBAL':
        return (
          assignment.roleCode === 'SYSTEM_ADMIN'
        );

      case 'REGION':
        return (
          Boolean(assignment.regionId) &&
          assignment.regionId === organization.regionId
        );

      case 'DISTRICT':
        return (
          Boolean(assignment.districtId) &&
          assignment.districtId === organization.districtId
        );

      case 'BRANCH':
        return (
          Boolean(assignment.branchId) &&
          assignment.branchId === organization.branchId
        );

      default:
        return false;
    }
  }) === true;
}