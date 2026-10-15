import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
} from '@nestjs/common';

import {
  AuthService,
} from './auth.service.js';

import {
  LoginDto,
} from './dto/login.dto.js';

import {
  RefreshTokenDto,
} from './dto/refresh-token.dto.js';

import {
  ChangePasswordDto,
} from './dto/change-password.dto.js';

import {
  UpdateMyProfileDto,
} from './dto/update-my-profile.dto.js';

import {
  Public,
} from './decorators/public.decorator.js';

import {
  CurrentUser,
} from './decorators/current-user.decorator.js';

import type {
  AuthenticatedUser,
} from './interfaces/authenticated-user.interface.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService:
      AuthService,
  ) {}

  // ==========================================================================
  // LOGIN
  // ==========================================================================

  @Public()
  @Post('login')
  login(
    @Body()
    dto: LoginDto,
  ) {
    return this.authService.login(
      dto.username,
      dto.password,
    );
  }

  // ==========================================================================
  // REFRESH TOKEN
  // ==========================================================================

  @Public()
  @Post('refresh')
  refresh(
    @Body()
    dto: RefreshTokenDto,
  ) {
    return this.authService.refresh(
      dto.refreshToken,
    );
  }

  // ==========================================================================
  // LOGOUT
  // ==========================================================================

  @Post('logout')
  logout(
    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.authService.logout(
      user.id,
    );
  }

  // ==========================================================================
  // CHANGE PASSWORD
  // ==========================================================================

  @Post('change-password')
  changePassword(
    @CurrentUser()
    user: AuthenticatedUser,

    @Body()
    dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  // ==========================================================================
  // CURRENT USER
  // ==========================================================================

  @Get('me')
  me(
    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.authService.me(
      user.id,
    );
  }

  // ==========================================================================
  // UPDATE CURRENT USER PROFILE
  // ==========================================================================

  @Patch('me')
  updateMyProfile(
    @CurrentUser()
    user: AuthenticatedUser,

    @Body()
    dto: UpdateMyProfileDto,
  ) {
    return this.authService.updateMyProfile(
      user.id,
      dto,
    );
  }
}