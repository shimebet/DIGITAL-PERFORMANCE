import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';

import {
  PermissionsService,
} from './permissions.service.js';

import {
  Permissions,
} from '../auth/decorators/permissions.decorator.js';

@Controller('permissions')
export class PermissionsController {
  constructor(
    private readonly permissionsService:
      PermissionsService,
  ) {}

  @Get()
  @Permissions('permission.read')
  findAll(
    @Query('module')
    module?: string,
  ) {
    if (module) {
      return this.permissionsService.findByModule(
        module,
      );
    }

    return this.permissionsService.findAll();
  }

  @Get(':id')
  @Permissions('permission.read')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.permissionsService.findOne(
      id,
    );
  }
}