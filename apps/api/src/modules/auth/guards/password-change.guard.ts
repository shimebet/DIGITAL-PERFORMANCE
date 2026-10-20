import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

import type {
  AuthenticatedUser,
} from '../interfaces/authenticated-user.interface.js';

@Injectable()
export class PasswordChangeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic =
      this.reflector.getAllAndOverride<boolean>(
        IS_PUBLIC_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
    }>();

    const user = request.user;

    if (!user) {
      throw new ForbiddenException(
        'Authenticated user not found',
      );
    }

    if (!user.mustChangePassword) {
      return true;
    }

    const controller = context.getClass().name;
    const handler = context.getHandler().name;

    const allowedAuthActions =
      controller === 'AuthController' &&
      [
        'changePassword',
        'logout',
        'me',
      ].includes(handler);

    if (allowedAuthActions) {
      return true;
    }

    throw new ForbiddenException(
      'You must change your initial password before accessing this resource',
    );
  }
}
