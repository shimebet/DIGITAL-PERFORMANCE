import { describe, expect, it, vi } from 'vitest';

import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { JwtStrategy } from './jwt.strategy.js';
import { PrismaService } from '../../../database/prisma/prisma.service.js';

describe('JwtStrategy role assignment validity', () => {
  const now = new Date();

  function createAssignment(
    roleCode: string,
    validFrom: Date | null,
    validTo: Date | null,
  ) {
    return {
      scopeType: 'GLOBAL',
      regionId: null,
      districtId: null,
      branchId: null,
      validFrom,
      validTo,
      role: {
        code: roleCode,
        status: 'ACTIVE',
        rolePermissions: [
          {
            permission: {
              code: 'submission.approve',
              status: 'ACTIVE',
            },
          },
        ],
      },
    };
  }

  function createStrategy(assignments: unknown[]) {
    const prisma = {
      user: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'test-user-id',
          username: 'test-user',
          firstName: 'Test',
          lastName: 'User',
          roles: assignments,
        }),
      },
    } as unknown as PrismaService;

    const config = {
      getOrThrow: vi.fn().mockReturnValue('test-secret'),
    } as unknown as ConfigService;

    return new JwtStrategy(config, prisma);
  }

  const payload = {
    sub: 'test-user-id',
    username: 'test-user',
  };

  it('accepts a currently valid role assignment', async () => {
    const strategy = createStrategy([
      createAssignment(
        'SUPER_ADMIN',
        new Date(now.getTime() - 60000),
        new Date(now.getTime() + 60000),
      ),
    ]);

    const user = await strategy.validate(payload);

    expect(user.roles).toContain('SUPER_ADMIN');
    expect(user.permissions).toContain('submission.approve');
    expect(user.roleAssignments).toHaveLength(1);
  });

  it('excludes expired administrator assignments', async () => {
    const strategy = createStrategy([
      createAssignment(
        'SUPER_ADMIN',
        null,
        new Date(now.getTime() - 60000),
      ),
    ]);

    const user = await strategy.validate(payload);

    expect(user.roles).not.toContain('SUPER_ADMIN');
    expect(user.permissions).not.toContain('submission.approve');
    expect(user.roleAssignments).toHaveLength(0);
  });

  it('excludes future-dated role assignments', async () => {
    const strategy = createStrategy([
      createAssignment(
        'REGIONAL_MANAGER',
        new Date(now.getTime() + 60000),
        null,
      ),
    ]);

    const user = await strategy.validate(payload);

    expect(user.roles).toHaveLength(0);
    expect(user.permissions).toHaveLength(0);
    expect(user.scopes).toHaveLength(0);
  });

  it('keeps valid roles while excluding expired roles', async () => {
    const strategy = createStrategy([
      createAssignment(
        'SUPER_ADMIN',
        null,
        new Date(now.getTime() - 60000),
      ),
      createAssignment(
        'BRANCH_MANAGER',
        new Date(now.getTime() - 60000),
        null,
      ),
    ]);

    const user = await strategy.validate(payload);

    expect(user.roles).toEqual(['BRANCH_MANAGER']);
    expect(user.roleAssignments).toHaveLength(1);
  });

  it('rejects inactive or missing users', async () => {
    const prisma = {
      user: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaService;

    const config = {
      getOrThrow: vi.fn().mockReturnValue('test-secret'),
    } as unknown as ConfigService;

    const strategy = new JwtStrategy(config, prisma);

    await expect(strategy.validate(payload))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });
});
