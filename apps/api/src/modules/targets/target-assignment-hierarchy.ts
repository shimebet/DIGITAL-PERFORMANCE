import { BadRequestException } from '@nestjs/common';
import { ScopeType } from '../../generated/prisma/enums.js';

type HierarchyInput = {
  scopeType: ScopeType;
  parentAssignmentId?: string | null;
};

const REQUIRED_PARENT_SCOPE: Partial<Record<ScopeType, ScopeType>> = {
  REGION: ScopeType.GLOBAL,
  DISTRICT: ScopeType.REGION,
  BRANCH: ScopeType.DISTRICT,
  STAFF: ScopeType.BRANCH,
};

export function validateParentRequirement(
  input: HierarchyInput,
): ScopeType | null {
  if (input.scopeType === ScopeType.GLOBAL) {
    if (input.parentAssignmentId != null) {
      throw new BadRequestException(
        'GLOBAL assignments must not have a parent assignment',
      );
    }

    return null;
  }

  const expectedParentScope = REQUIRED_PARENT_SCOPE[input.scopeType];

  if (!expectedParentScope) {
    throw new BadRequestException('Unsupported assignment scope');
  }

  if (!input.parentAssignmentId) {
    throw new BadRequestException(
      `${input.scopeType} assignments require parentAssignmentId`,
    );
  }

  return expectedParentScope;
}
export type AssignmentHierarchyRecord = {
  id: string;
  targetId: string;
  scopeType: ScopeType;
  regionId: string | null;
  districtId: string | null;
  branchId: string | null;
  userId: string | null;
  productId: string | null;
};

export type ChildAssignmentHierarchyInput = {
  targetId: string;
  scopeType: ScopeType;
  regionId?: string | null;
  districtId?: string | null;
  branchId?: string | null;
  userId?: string | null;
  productId?: string | null;
};

export function validateParentAssignment(
  child: ChildAssignmentHierarchyInput,
  parent: AssignmentHierarchyRecord,
): void {
  const expectedScope = validateParentRequirement({
    scopeType: child.scopeType,
    parentAssignmentId: parent.id,
  });

  if (expectedScope === null) {
    throw new BadRequestException(
      'GLOBAL assignments cannot have a parent',
    );
  }

  if (parent.scopeType !== expectedScope) {
    throw new BadRequestException(
      `Invalid parent scope: ${child.scopeType} requires ${expectedScope}`,
    );
  }

  if (parent.targetId !== child.targetId) {
    throw new BadRequestException(
      'Parent assignment belongs to a different target',
    );
  }

  if (parent.productId !== (child.productId ?? null)) {
    throw new BadRequestException(
      'Parent assignment product does not match',
    );
  }

  switch (child.scopeType) {
    case ScopeType.REGION:
      // A GLOBAL parent has no organizational recipient.
      if (
        parent.regionId !== null ||
        parent.districtId !== null ||
        parent.branchId !== null ||
        parent.userId !== null
      ) {
        throw new BadRequestException(
          'GLOBAL parent must not have organizational IDs',
        );
      }
      break;

    case ScopeType.DISTRICT:
      if (
        !child.regionId ||
        parent.regionId !== child.regionId
      ) {
        throw new BadRequestException(
          'Parent REGION does not match the district region',
        );
      }
      break;

    case ScopeType.BRANCH:
      if (
        !child.districtId ||
        parent.districtId !== child.districtId
      ) {
        throw new BadRequestException(
          'Parent DISTRICT does not match the branch district',
        );
      }
      break;

    case ScopeType.STAFF:
      if (
        !child.branchId ||
        parent.branchId !== child.branchId
      ) {
        throw new BadRequestException(
          'Parent BRANCH does not match the staff branch',
        );
      }
      break;
  }
}