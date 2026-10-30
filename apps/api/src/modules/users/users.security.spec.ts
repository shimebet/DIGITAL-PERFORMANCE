
import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { UsersService } from './users.service.js';
import { PrismaService } from '../../database/prisma/prisma.service.js';

import type { UpdateUserDto } from './dto/update-user.dto.js';

describe('UsersService - Security', () => {
  let service: UsersService;

  const actorId = 'admin-user-1';
  const targetId = 'user-1';

  const existingUser = {
    id: targetId,
    username: 'testuser',
    status: 'ACTIVE',
    deletedAt: null,
  };

  const tx = {
    user: {
      findFirst: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    userRole: {
      findFirst: vi.fn(),
    },
    staffProfile: {
      upsert: vi.fn(),
    },
    refreshToken: {
      updateMany: vi.fn(),
    },
    userSession: {
      updateMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  };

  const prismaMock = {
    $transaction: vi.fn(),
    user: {
      findFirst: vi.fn(),
    },
    branch: {
      findFirst: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.resetAllMocks();

    tx.user.findFirst.mockResolvedValue({
      ...existingUser,
    });

    tx.user.count.mockResolvedValue(1);

    tx.userRole.findFirst.mockResolvedValue(null);

    tx.user.update.mockResolvedValue({
      ...existingUser,
    });

    tx.refreshToken.updateMany.mockResolvedValue({
      count: 1,
    });

    tx.userSession.updateMany.mockResolvedValue({
      count: 1,
    });

    tx.auditLog.create.mockResolvedValue({
      id: 'audit-1',
    });

    prismaMock.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => Promise<unknown>) =>
        callback(tx),
    );

    prismaMock.user.findFirst.mockResolvedValue({
      ...existingUser,
    });

    service = new UsersService(
      prismaMock as unknown as PrismaService,
    );
  });

  describe('Last global administrator protection', () => {
    it('prevents deactivating the last active global administrator', async () => {
      tx.userRole.findFirst.mockResolvedValue({
        id: 'assignment-1',
      });

      tx.user.count.mockResolvedValue(0);

      const dto: UpdateUserDto = {
        status: 'INACTIVE',
      };

      await expect(
        service.update(targetId, dto, actorId),
      ).rejects.toThrow(ForbiddenException);

      expect(tx.userRole.findFirst).toHaveBeenCalled();

      expect(tx.user.count).toHaveBeenCalled();

      expect(tx.user.update).not.toHaveBeenCalled();

      expect(
        tx.refreshToken.updateMany,
      ).not.toHaveBeenCalled();

      expect(
        tx.auditLog.create,
      ).not.toHaveBeenCalled();
    });

    it('allows deactivation when another active global administrator exists', async () => {
      tx.userRole.findFirst.mockResolvedValue({
        id: 'assignment-1',
      });

      tx.user.count.mockResolvedValue(1);

      const dto: UpdateUserDto = {
        status: 'INACTIVE',
      };

      await service.update(
        targetId,
        dto,
        actorId,
      );

      expect(tx.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: targetId },
          data: expect.objectContaining({
            status: 'INACTIVE',
          }),
        }),
      );

      expect(
        tx.refreshToken.updateMany,
      ).toHaveBeenCalled();

      expect(
        tx.userSession.updateMany,
      ).toHaveBeenCalled();
    });

    it('prevents deleting the last active global administrator', async () => {
      tx.userRole.findFirst.mockResolvedValue({
        id: 'assignment-1',
      });

      tx.user.count.mockResolvedValue(0);

      await expect(
        service.softDelete(
          targetId,
          actorId,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(tx.user.update).not.toHaveBeenCalled();

      expect(
        tx.auditLog.create,
      ).not.toHaveBeenCalled();
    });
  });

  describe('Account status security', () => {
    it('prevents administrator self-deactivation', async () => {
      await expect(
        service.update(
          targetId,
          { status: 'INACTIVE' },
          targetId,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(tx.user.update).not.toHaveBeenCalled();
    });

    it('revokes refresh tokens and sessions when an account is suspended', async () => {
      await service.update(
        targetId,
        { status: 'SUSPENDED' },
        actorId,
      );

      expect(
        tx.refreshToken.updateMany,
      ).toHaveBeenCalledWith({
        where: {
          userId: targetId,
          revokedAt: null,
        },
        data: {
          revokedAt: expect.any(Date),
        },
      });

      expect(
        tx.userSession.updateMany,
      ).toHaveBeenCalledWith({
        where: {
          userId: targetId,
          status: 'ACTIVE',
        },
        data: {
          status: 'REVOKED',
          revokedAt: expect.any(Date),
        },
      });
    });

    it('does not revoke sessions for a profile-only update', async () => {
      await service.update(
        targetId,
        { firstName: 'Updated' },
        actorId,
      );

      expect(
        tx.refreshToken.updateMany,
      ).not.toHaveBeenCalled();

      expect(
        tx.userSession.updateMany,
      ).not.toHaveBeenCalled();
    });

    it('records an audit entry for account status changes', async () => {
      await service.update(
        targetId,
        { status: 'LOCKED' },
        actorId,
      );

expect(tx.auditLog.create).toHaveBeenCalledWith({
  data: expect.objectContaining({
    userId: actorId,
    action: 'UPDATE',
    module: 'USERS',
    entityType: 'User',
    entityId: targetId,
    oldValue: expect.objectContaining({
      status: 'ACTIVE',
    }),
    newValue: expect.objectContaining({
      status: 'LOCKED',
    }),
  }),
});
    });
  });

  describe('Soft delete security', () => {
    it('prevents administrator self-deletion', async () => {
      await expect(
        service.softDelete(
          targetId,
          targetId,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(tx.user.update).not.toHaveBeenCalled();
    });

    it('soft-deletes users and revokes their sessions', async () => {
      const result = await service.softDelete(
        targetId,
        actorId,
      );

      expect(tx.user.update).toHaveBeenCalledWith({
        where: {
          id: targetId,
        },
        data: {
          deletedAt: expect.any(Date),
          status: 'INACTIVE',
        },
      });

      expect(
        tx.refreshToken.updateMany,
      ).toHaveBeenCalled();

      expect(
        tx.userSession.updateMany,
      ).toHaveBeenCalled();

      expect(tx.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: actorId,
          action: 'DELETE',
          entityId: targetId,
        }),
      });

      expect(result).toEqual({
        success: true,
        message: 'User deleted successfully',
      });
    });
  });

  describe('Administrator password reset', () => {
    it('rejects self-password-reset', async () => {
      await expect(
        service.resetPassword(
          targetId,
          'TemporaryPassword123!',
          targetId,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(
        prismaMock.$transaction,
      ).not.toHaveBeenCalled();
    });

    it('rejects temporary passwords shorter than 12 characters', async () => {
      await expect(
        service.resetPassword(
          targetId,
          'Short123!',
          actorId,
        ),
      ).rejects.toThrow(
        'Temporary password must contain 12 to 128 characters',
      );

      expect(
        prismaMock.$transaction,
      ).not.toHaveBeenCalled();
    });

    it('hashes the temporary password and revokes sessions', async () => {
      const temporaryPassword = 'TemporaryPassword123!';

      const result = await service.resetPassword(
        targetId,
        temporaryPassword,
        actorId,
      );

      expect(tx.user.update).toHaveBeenCalledWith({
        where: {
          id: targetId,
        },
        data: {
          passwordHash: expect.any(String),
          mustChangePassword: true,
          passwordChangedAt: expect.any(Date),
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });

      const updateCall = tx.user.update.mock.calls[0]?.[0];

      const savedHash = updateCall?.data?.passwordHash;

      expect(savedHash).not.toBe(temporaryPassword);

      expect(savedHash).toMatch(/^\$argon2/);

      expect(
        tx.refreshToken.updateMany,
      ).toHaveBeenCalled();

      expect(
        tx.userSession.updateMany,
      ).toHaveBeenCalled();

      expect(tx.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: actorId,
          action: 'PASSWORD_CHANGED',
          module: 'USERS',
          entityId: targetId,
        }),
      });

      expect(result.success).toBe(true);
    });

    it('rejects password reset for a missing user', async () => {
      tx.user.findFirst.mockResolvedValue(null);

      await expect(
        service.resetPassword(
          'missing-user',
          'TemporaryPassword123!',
          actorId,
        ),
      ).rejects.toThrow(NotFoundException);

      expect(tx.user.update).not.toHaveBeenCalled();
    });
  });

  describe('Transaction safety', () => {
    it('uses Serializable isolation for user updates', async () => {
      await service.update(
        targetId,
        { firstName: 'Updated' },
        actorId,
      );

      expect(
        prismaMock.$transaction,
      ).toHaveBeenCalledWith(
        expect.any(Function),
        {
          isolationLevel: 'Serializable',
        },
      );
    });

    it('propagates audit failures during a transaction', async () => {
      tx.auditLog.create.mockRejectedValue(
        new Error('Audit write failed'),
      );

      await expect(
        service.softDelete(
          targetId,
          actorId,
        ),
      ).rejects.toThrow('Audit write failed');
    });
  });
});
