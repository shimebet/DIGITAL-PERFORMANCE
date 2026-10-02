import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import {
  RolesService,
} from './roles.service.js';

import {
  CreateRoleDto,
} from './dto/create-role.dto.js';

import {
  UpdateRoleDto,
} from './dto/update-role.dto.js';

import {
  Permissions,
} from '../auth/decorators/permissions.decorator.js';

@Controller('roles')
export class RolesController {
  constructor(
    private readonly rolesService:
      RolesService,
  ) {}

  @Post()
  @Permissions('role.create')
  create(
    @Body()
    dto: CreateRoleDto,
  ) {
    return this.rolesService.create(
      dto,
    );
  }

  @Get()
  @Permissions('role.read')
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @Permissions('role.read')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.rolesService.findOne(
      id,
    );
  }

  @Patch(':id')
  @Permissions('role.update')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateRoleDto,
  ) {
    return this.rolesService.update(
      id,
      dto,
    );
  }
}