import { describe, expect, it, vi } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';
import { PrismaService } from '../../database/prisma/prisma.service.js';

describe('AuthService', () => {
  it('should be defined with mocked dependencies', () => {
    const usersService = {
      findOne: vi.fn(),
    } as unknown as UsersService;

    const prismaService = {
      user: {
        findUnique: vi.fn(),
      },
    } as unknown as PrismaService;

    const jwtService = {
      signAsync: vi.fn(),
      verifyAsync: vi.fn(),
    } as unknown as JwtService;

    const configService = {
      get: vi.fn(),
      getOrThrow: vi.fn(),
    } as unknown as ConfigService;

    const service = new AuthService(
      usersService,
      prismaService,
      jwtService,
      configService,
    );

    expect(service).toBeDefined();
  });
});