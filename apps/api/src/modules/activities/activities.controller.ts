import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import {
  ActivitiesService,
} from './activities.service.js';

import {
  CreateActivityDto,
} from './dto/create-activity.dto.js';

import {
  UpdateActivityDto,
} from './dto/update-activity.dto.js';

import {
  Permissions,
} from '../auth/decorators/permissions.decorator.js';

import {
  CurrentUser,
} from '../auth/decorators/current-user.decorator.js';

import type {
  AuthenticatedUser,
} from '../auth/interfaces/authenticated-user.interface.js';

@Controller('activities')
export class ActivitiesController {
  constructor(
    private readonly activitiesService:
      ActivitiesService,
  ) {}

  @Post()
  @Permissions('activity.create')
  create(
    @Body()
    dto: CreateActivityDto,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.activitiesService.create(
      dto,
      user,
    );
  }

  @Get('mine')
  @Permissions('activity.read')
  findMine(
    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.activitiesService.findMine(
      user,
    );
  }

  @Get(':id')
  @Permissions('activity.read')
  findOne(
    @Param('id')
    id: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.activitiesService.findOne(
      id,
      user,
    );
  }

  @Patch(':id')
  @Permissions('activity.update')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateActivityDto,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.activitiesService.update(
      id,
      dto,
      user,
    );
  }
}