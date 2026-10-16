import { describe, expect, it } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ReportsController } from './reports.controller.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';

describe('Reports export permissions', () => {
  const reflector = new Reflector();
  const guard = new PermissionsGuard(reflector);

  const createContext = (
    method: keyof ReportsController,
    permissions: string[],
  ): ExecutionContext => {
    const handler = ReportsController.prototype[method];

    return {
      getHandler: () => handler,
      getClass: () => ReportsController,
      switchToHttp: () => ({
        getRequest: () => ({
          user: {
            id: 'test-user',
            roles: ['BRANCH_MANAGER'],
            permissions,
          },
        }),
      }),
    } as unknown as ExecutionContext;
  };

  it('denies CSV export without report.export permission', () => {
    const context = createContext('exportCsv', ['report.read']);

    expect(() => guard.canActivate(context)).toThrow(
      ForbiddenException,
    );
  });

  it('denies Excel export without report.export permission', () => {
    const context = createContext('exportExcel', ['report.read']);

    expect(() => guard.canActivate(context)).toThrow(
      ForbiddenException,
    );
  });

  it('allows CSV export with report.export permission', () => {
    const context = createContext('exportCsv', ['report.export']);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows Excel export with report.export permission', () => {
    const context = createContext('exportExcel', ['report.export']);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows report reading with report.read permission', () => {
    const context = createContext('getPerformance', ['report.read']);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('denies report reading without report.read permission', () => {
    const context = createContext('getPerformance', ['report.export']);

    expect(() => guard.canActivate(context)).toThrow(
      ForbiddenException,
    );
  });
});
