import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import {
  Reflector,
} from '@nestjs/core';

import {
  PERMISSIONS_KEY,
} from '../decorators/permissions.decorator.js';

import type {
  AuthenticatedUser,
} from '../interfaces/authenticated-user.interface.js';

@Injectable()
export class PermissionsGuard
  implements CanActivate
{
  constructor(
    private readonly reflector:
      Reflector,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean {
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(
        PERMISSIONS_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    if (
      !requiredPermissions ||
      requiredPermissions.length ===
        0
    ) {
      return true;
    }

    const request =
      context
        .switchToHttp()
        .getRequest<{
          user?: AuthenticatedUser;
        }>();

    const user =
      request.user;

    if (!user) {
      return false;
    }

const isGlobalSuperAdmin =
  user.roleAssignments?.some(
    (assignment) =>
      assignment.roleCode === 'SUPER_ADMIN' &&
      assignment.scopeType === 'GLOBAL',
  ) === true;

if (isGlobalSuperAdmin) {
  return true;
}

const allowed = requiredPermissions.every((permission) =>
  user.roleAssignments?.some((assignment) =>
    assignment.permissions?.includes(permission),
  ) === true,
);

    if (!allowed) {
      throw new ForbiddenException(
        'You do not have permission to perform this operation',
      );
    }

    return true;
  }
}