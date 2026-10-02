import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from '@nestjs/common';

import {
  UserRolesService,
} from './user-roles.service.js';

import {
  AssignUserRoleDto,
} from './dto/assign-user-role.dto.js';

import {
  Permissions,
} from '../auth/decorators/permissions.decorator.js';

@Controller('user-roles')
export class UserRolesController {
  constructor(
    private readonly userRolesService:
      UserRolesService,
  ) {}

  @Post()
  @Permissions(
    'permission.assign',
  )
  assign(
    @Body()
    dto: AssignUserRoleDto,
  ) {
    return this.userRolesService.assign(
      dto,
    );
  }

  @Get('user/:userId')
  @Permissions('role.read')
  findByUser(
    @Param('userId')
    userId: string,
  ) {
    return this.userRolesService.findByUser(
      userId,
    );
  }

  @Delete(':id')
  @Permissions(
    'permission.assign',
  )
  remove(
    @Param('id')
    id: string,
  ) {
    return this.userRolesService.remove(
      id,
    );
  }
}