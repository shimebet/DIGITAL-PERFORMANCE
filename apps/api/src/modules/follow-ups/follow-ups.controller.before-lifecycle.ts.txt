import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import {
  FollowUpsService,
} from './follow-ups.service.js';

import {
  CreateFollowUpDto,
} from './dto/create-follow-up.dto.js';

import {
  UpdateFollowUpDto,
} from './dto/update-follow-up.dto.js';

import {
  UpdateFollowUpStatusDto,
} from './dto/update-follow-up-status.dto.js';

import {
  Permissions,
} from '../auth/decorators/permissions.decorator.js';

import {
  CurrentUser,
} from '../auth/decorators/current-user.decorator.js';

import type {
  AuthenticatedUser,
} from '../auth/interfaces/authenticated-user.interface.js';

@Controller('follow-ups')
export class FollowUpsController {
  constructor(
    private readonly followUpsService:
      FollowUpsService,
  ) {}

  @Post()
  @Permissions('followup.create')
  create(
    @Body()
    dto: CreateFollowUpDto,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.followUpsService.create(
      dto,
      user,
    );
  }

  @Get('mine')
  @Permissions('followup.read')
  findMine(
    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.followUpsService.findMine(
      user,
    );
  }

  @Get('mine/overdue')
  @Permissions('followup.read')
  findMyOverdue(
    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.followUpsService.findMyOverdue(
      user,
    );
  }

  @Get('summary')
  @Permissions('followup.read')
  summary(
    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.followUpsService.summary(
      user,
    );
  }

  @Get()
  @Permissions('followup.read')
  findAll(
    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.followUpsService.findAllScoped(
      user,
    );
  }

  @Get(':id')
  @Permissions('followup.read')
  findOne(
    @Param('id')
    id: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.followUpsService.findOne(
      id,
      user,
    );
  }

  @Patch(':id')
  @Permissions('followup.update')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateFollowUpDto,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.followUpsService.update(
      id,
      dto,
      user,
    );
  }

  @Patch(':id/status')
  @Permissions('followup.update')
  updateStatus(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateFollowUpStatusDto,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.followUpsService.updateStatus(
      id,
      dto,
      user,
    );
  }
}