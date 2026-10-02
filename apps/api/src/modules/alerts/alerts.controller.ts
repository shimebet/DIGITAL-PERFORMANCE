import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import {
  AlertsService,
} from './alerts.service.js';

import {
  AlertDetectionService,
} from './alert-detection.service.js';

import {
  AlertQueryDto,
} from './dto/alert-query.dto.js';

import {
  CurrentUser,
} from '../auth/decorators/current-user.decorator.js';

import {
  Permissions,
} from '../auth/decorators/permissions.decorator.js';

import type {
  AuthenticatedUser,
} from '../auth/interfaces/authenticated-user.interface.js';

@Controller('alerts')
export class AlertsController {
  constructor(
    private readonly alertsService: AlertsService,
    private readonly detectionService: AlertDetectionService,
  ) {}

  @Get()
  @Permissions('alert.read')
  findAll(
    @Query()
    query: AlertQueryDto,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.alertsService.findAll(
      query,
      user,
    );
  }

  @Post('detect')
  @Permissions('alert.update')
  detect() {
    return this.detectionService.runAll();
  }

  @Get(':id')
  @Permissions('alert.read')
  findOne(
    @Param('id')
    id: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.alertsService.findOne(
      id,
      user,
    );
  }

  @Patch(':id/acknowledge')
  @Permissions('alert.update')
  acknowledge(
    @Param('id')
    id: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.alertsService.acknowledge(
      id,
      user,
    );
  }

  @Patch(':id/resolve')
  @Permissions('alert.update')
  resolve(
    @Param('id')
    id: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.alertsService.resolve(
      id,
      user,
    );
  }
}