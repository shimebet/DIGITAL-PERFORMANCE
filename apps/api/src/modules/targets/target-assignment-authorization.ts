
import { ForbiddenException } from '@nestjs/common';

import type {
  AuthenticatedUser,
} from '../auth/interfaces/authenticated-user.interface.js';

import {
  hasScopedPermission,
  type OrganizationalResource,
} from '../auth/services/scoped-permission.js';

import type {
  AssignTargetDto,
} from './dto/assign-target.dto.js';

type AssignmentScope = AssignTargetDto['scopeType'];

const ALLOWED_MANAGER_ROLES: Record<
  AssignmentScope,
  readonly string[]
> = {
  GLOBAL: ['SUPER_ADMIN', 'SYSTEM_ADMIN'],

  REGION: ['SUPER_ADMIN', 'SYSTEM_ADMIN'],

  DISTRICT: [
    'SUPER_ADMIN',
    'SYSTEM_ADMIN',
    'REGIONAL_MANAGER',
  ],

  BRANCH: [
    'SUPER_ADMIN',
    'SYSTEM_ADMIN',
    'DISTRICT_MANAGER',
  ],

  STAFF: [
    'SUPER_ADMIN',
    'SYSTEM_ADMIN',
    'BRANCH_MANAGER',
  ],
};

export function assertTargetAssignmentPermission(
  currentUser: AuthenticatedUser,
  scopeType: AssignmentScope,
  resource: OrganizationalResource,
  permission: 'target.create' | 'target.delete' = 'target.create',
): void {
  const allowedRoles = ALLOWED_MANAGER_ROLES[scopeType];

  if (!allowedRoles) {
    throw new ForbiddenException(
      'Unsupported target assignment scope',
    );
  }

  const authorized = hasScopedPermission(
    currentUser,
    permission,
    resource,
    allowedRoles,
  );

  if (!authorized) {
    throw new ForbiddenException(
      'You are not authorized to manage target assignments at this organizational level',
    );
  }
}
