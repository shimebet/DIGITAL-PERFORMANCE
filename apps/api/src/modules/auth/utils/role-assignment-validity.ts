export interface RoleAssignmentValidity {
  validFrom?: Date | string | null;
  validTo?: Date | string | null;
}

export function isRoleAssignmentCurrentlyValid(
  assignment: RoleAssignmentValidity,
  now: Date = new Date(),
): boolean {
  const currentTime = now.getTime();

  if (!Number.isFinite(currentTime)) {
    return false;
  }

  if (assignment.validFrom != null) {
    const startTime = new Date(assignment.validFrom).getTime();

    if (!Number.isFinite(startTime) || startTime > currentTime) {
      return false;
    }
  }

  if (assignment.validTo != null) {
    const endTime = new Date(assignment.validTo).getTime();

    if (!Number.isFinite(endTime) || endTime <= currentTime) {
      return false;
    }
  }

  return true;
}
