
import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
} from '@nestjs/common';

import { UserRolesService } from './user-roles.service.js';

import { AssignUserRoleDto } from './dto/assign-user-role.dto.js';

import {
  Permissions,
} from '../auth/decorators/permissions.decorator.js';

import type {
  AuthenticatedUser,
} from '../auth/interfaces/authenticated-user.interface.js';

// ==========================================================
// AUTHORIZATION
// ==========================================================

function assertGlobalAdministrator(
  user: AuthenticatedUser,
): void {
  const isGlobalAdministrator =
    user?.roleAssignments?.some(
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

// ==========================================================
// USER ROLES CONTROLLER
// ==========================================================

@Controller('user-roles')
export class UserRolesController {
  constructor(
    private readonly userRolesService: UserRolesService,
  ) {}

  // ========================================================
  // ASSIGN ROLE
  // ========================================================

  @Post()
  @Permissions('permission.assign')
  assign(
    @Body() dto: AssignUserRoleDto,
    @Req() request: { user: AuthenticatedUser },
  ) {
    assertGlobalAdministrator(request?.user);

  return this.userRolesService.assign(
  dto,
  request.user.id,
);
  }

  // ========================================================
  // GET USER ROLES
  // ========================================================

  @Get('user/:userId')
  @Permissions('role.read')
  findByUser(
    @Param('userId') userId: string,
    @Req() request: { user: AuthenticatedUser },
  ) {
    assertGlobalAdministrator(request?.user);

    return this.userRolesService.findByUser(userId);
  }

  // ========================================================
  // REMOVE ROLE ASSIGNMENT
  // ========================================================

  @Delete(':id')
  @Permissions('permission.assign')
  remove(
    @Param('id') id: string,
    @Req() request: { user: AuthenticatedUser },
  ) {
    assertGlobalAdministrator(request?.user);

    return this.userRolesService.remove(id);
  }
}
