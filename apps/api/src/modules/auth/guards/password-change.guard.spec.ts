import {
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { PasswordChangeGuard } from './password-change.guard.js';

describe('PasswordChangeGuard', () => {
  function createContext(
    controllerName: string,
    handlerName: string,
    mustChangePassword?: boolean,
  ): ExecutionContext {
    const handler = {
      [handlerName]: function () {},
    }[handlerName];

    const controller = {
      [controllerName]: class {},
    }[controllerName];

    return {
      getHandler: () => handler,
      getClass: () => controller,
      switchToHttp: () => ({
        getRequest: () => ({
          user:
            mustChangePassword === undefined
              ? undefined
              : { mustChangePassword },
        }),
      }),
    } as unknown as ExecutionContext;
  }

  function createGuard(isPublic = false) {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(isPublic),
    };

    return new PasswordChangeGuard(
      reflector as unknown as Reflector,
    );
  }

  it('allows public endpoints', () => {
    const guard = createGuard(true);

    expect(
      guard.canActivate(
        createContext('AuthController', 'login'),
      ),
    ).toBe(true);
  });

  it('blocks business APIs before password change', () => {
    const guard = createGuard();

    expect(() =>
      guard.canActivate(
        createContext(
          'DashboardController',
          'getDashboard',
          true,
        ),
      ),
    ).toThrow(ForbiddenException);
  });

  it.each([
    'changePassword',
    'logout',
    'me',
  ])('allows auth action %s before password change', (action) => {
    const guard = createGuard();

    expect(
      guard.canActivate(
        createContext('AuthController', action, true),
      ),
    ).toBe(true);
  });

  it('allows normal access after password change', () => {
    const guard = createGuard();

    expect(
      guard.canActivate(
        createContext(
          'DashboardController',
          'getDashboard',
          false,
        ),
      ),
    ).toBe(true);
  });

  it('rejects protected requests without a user', () => {
    const guard = createGuard();

    expect(() =>
      guard.canActivate(
        createContext(
          'DashboardController',
          'getDashboard',
        ),
      ),
    ).toThrow(ForbiddenException);
  });

  it('blocks profile updates before password change', () => {
    const guard = createGuard();

    expect(() =>
      guard.canActivate(
        createContext(
          'AuthController',
          'updateMyProfile',
          true,
        ),
      ),
    ).toThrow(ForbiddenException);
  });
});
