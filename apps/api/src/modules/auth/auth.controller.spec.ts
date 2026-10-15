
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  AuthController,
} from './auth.controller.js';

import {
  AuthService,
} from './auth.service.js';

import type {
  AuthenticatedUser,
} from './interfaces/authenticated-user.interface.js';

import type {
  LoginDto,
} from './dto/login.dto.js';

import type {
  RefreshTokenDto,
} from './dto/refresh-token.dto.js';

import type {
  ChangePasswordDto,
} from './dto/change-password.dto.js';

import type {
  UpdateMyProfileDto,
} from './dto/update-my-profile.dto.js';

describe('AuthController', () => {
  let controller: AuthController;

  const authServiceMock = {
    login: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
    changePassword: vi.fn(),
    me: vi.fn(),
    updateMyProfile: vi.fn(),
  };

  const user = {
    id: 'user-1',
  } as AuthenticatedUser;

  beforeEach(() => {
    vi.resetAllMocks();

    controller = new AuthController(
      authServiceMock as unknown as AuthService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // =========================================================
  // LOGIN
  // =========================================================

  it('should login with username and password', async () => {
    const dto = {
      username: 'testuser',
      password: 'TestPassword123!',
    } as LoginDto;

    const expected = {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    };

    authServiceMock.login.mockResolvedValue(expected);

    const result = await controller.login(dto);

    expect(authServiceMock.login).toHaveBeenCalledWith(
      'testuser',
      'TestPassword123!',
    );

    expect(result).toEqual(expected);
  });

  it('should propagate login errors', async () => {
    const dto = {
      username: 'testuser',
      password: 'wrong-password',
    } as LoginDto;

    authServiceMock.login.mockRejectedValue(
      new Error('Invalid credentials'),
    );

    await expect(
      controller.login(dto),
    ).rejects.toThrow('Invalid credentials');
  });

  // =========================================================
  // REFRESH TOKEN
  // =========================================================

  it('should refresh an access token', async () => {
    const dto = {
      refreshToken: 'existing-refresh-token',
    } as RefreshTokenDto;

    const expected = {
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    };

    authServiceMock.refresh.mockResolvedValue(expected);

    const result = await controller.refresh(dto);

    expect(authServiceMock.refresh).toHaveBeenCalledWith(
      'existing-refresh-token',
    );

    expect(result).toEqual(expected);
  });

  // =========================================================
  // LOGOUT
  // =========================================================

  it('should logout the current user', async () => {
    const expected = {
      success: true,
    };

    authServiceMock.logout.mockResolvedValue(expected);

    const result = await controller.logout(user);

    expect(authServiceMock.logout).toHaveBeenCalledWith(
      'user-1',
    );

    expect(result).toEqual(expected);
  });

  // =========================================================
  // CHANGE PASSWORD
  // =========================================================

  it('should change the current user password', async () => {
    const dto = {
      currentPassword: 'OldPassword123!',
      newPassword: 'NewPassword123!',
    } as ChangePasswordDto;

    const expected = {
      success: true,
    };

    authServiceMock.changePassword.mockResolvedValue(expected);

    const result = await controller.changePassword(
      user,
      dto,
    );

    expect(
      authServiceMock.changePassword,
    ).toHaveBeenCalledWith(
      'user-1',
      'OldPassword123!',
      'NewPassword123!',
    );

    expect(result).toEqual(expected);
  });

  // =========================================================
  // CURRENT USER
  // =========================================================

  it('should return the current user profile', async () => {
    const expected = {
      id: 'user-1',
      username: 'testuser',
    };

    authServiceMock.me.mockResolvedValue(expected);

    const result = await controller.me(user);

    expect(authServiceMock.me).toHaveBeenCalledWith(
      'user-1',
    );

    expect(result).toEqual(expected);
  });

  // =========================================================
  // UPDATE PROFILE
  // =========================================================

  it('should update the current user profile', async () => {
    const dto = {
      firstName: 'Updated',
    } as UpdateMyProfileDto;

    const expected = {
      id: 'user-1',
      firstName: 'Updated',
    };

    authServiceMock.updateMyProfile.mockResolvedValue(
      expected,
    );

    const result = await controller.updateMyProfile(
      user,
      dto,
    );

    expect(
      authServiceMock.updateMyProfile,
    ).toHaveBeenCalledWith(
      'user-1',
      dto,
    );

    expect(result).toEqual(expected);
  });

  it('should propagate profile update errors', async () => {
    const dto = {} as UpdateMyProfileDto;

    authServiceMock.updateMyProfile.mockRejectedValue(
      new Error('Profile update failed'),
    );

    await expect(
      controller.updateMyProfile(user, dto),
    ).rejects.toThrow('Profile update failed');
  });
});
