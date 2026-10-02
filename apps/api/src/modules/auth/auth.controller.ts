import {
  Body,
  Controller,
  Get,
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

  @Post('logout')
  logout(
    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.authService.logout(
      user.id,
    );
  }
  

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

  @Get('me')
  me(
    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.authService.me(
      user.id,
    );
  }
}