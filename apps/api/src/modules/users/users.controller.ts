
import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto.js';

import {
  Permissions,
} from '../auth/decorators/permissions.decorator.js';

import {
  CurrentUser,
} from '../auth/decorators/current-user.decorator.js';

import type {
  AuthenticatedUser,
} from '../auth/interfaces/authenticated-user.interface.js';

// ============================================================
// GLOBAL ADMINISTRATOR ACCESS VALIDATION
// ============================================================

function assertGlobalAdministrator(
  user: AuthenticatedUser,
): void {
  const isGlobalAdministrator =
    user.roleAssignments?.some(
      (assignment) =>
        assignment.scopeType === 'GLOBAL' &&
        (
          assignment.roleCode === 'SUPER_ADMIN' ||
          assignment.roleCode === 'SYSTEM_ADMIN'
        ),
    ) ?? false;

  if (!isGlobalAdministrator) {
    throw new ForbiddenException(
      'Global administrator access is required',
    );
  }
}

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  // ============================================================
  // CREATE USER
  // ============================================================

  @Post()
  @Permissions('user.create')
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    assertGlobalAdministrator(user);

    return this.usersService.create(dto);
  }

  // ============================================================
  // LIST USERS
  // ============================================================

  @Get()
  @Permissions('user.read')
  findAll(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    assertGlobalAdministrator(user);

    return this.usersService.findAll();
  }

  // ============================================================
  // GET USER BY ID
  // ============================================================

  @Get(':id')
  @Permissions('user.read')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    assertGlobalAdministrator(user);

    return this.usersService.findOne(id);
  }

  // ============================================================
  // UPDATE USER PROFILE OR ACCOUNT STATUS
  // ============================================================

  @Patch(':id')
  @Permissions('user.update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    assertGlobalAdministrator(user);

    if (
      user.id === id &&
      dto.status !== undefined &&
      dto.status !== 'ACTIVE'
    ) {
      throw new ForbiddenException(
        'You cannot deactivate, lock, or suspend your own account',
      );
    }

    return this.usersService.update(
      id,
      dto,
      user.id,
    );
  }

  // ============================================================
  // ADMINISTRATOR PASSWORD RESET
  // ============================================================

  @Post(':id/reset-password')
  @Permissions('user.update')
  resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetUserPasswordDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    assertGlobalAdministrator(user);

    if (user.id === id) {
      throw new ForbiddenException(
        'Use the change-password endpoint to update your own password',
      );
    }

    return this.usersService.resetPassword(
      id,
      dto.temporaryPassword,
      user.id,
    );
  }

  // ============================================================
  // SOFT DELETE USER
  // ============================================================

  @Delete(':id')
  @Permissions('user.delete')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    assertGlobalAdministrator(user);

    if (user.id === id) {
      throw new ForbiddenException(
        'You cannot delete your own account',
      );
    }

    return this.usersService.softDelete(
      id,
      user.id,
    );
  }
}
