import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { TargetsService } from './targets.service.js';

import { CreateTargetDto } from './dto/create-target.dto.js';
import { UpdateTargetDto } from './dto/update-target.dto.js';
import { AssignTargetDto } from './dto/assign-target.dto.js';

import {
  Permissions,
} from '../auth/decorators/permissions.decorator.js';

import {
  CurrentUser,
} from '../auth/decorators/current-user.decorator.js';

import type {
  AuthenticatedUser,
} from '../auth/interfaces/authenticated-user.interface.js';

@Controller('targets')
export class TargetsController {
  constructor(
    private readonly targetsService: TargetsService,
  ) {}

  // ==========================================================================
  // TARGET DEFINITIONS
  // ==========================================================================

  @Post()
  @Permissions('target.create')
  create(
    @Body()
    dto: CreateTargetDto,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.targetsService.create(
      dto,
      user,
    );
  }

@Get()
@Permissions('target.read')
findAll(
  @CurrentUser()
  user: AuthenticatedUser,
) {
  return this.targetsService.findAll(user);
}

@Get(':id')
@Permissions('target.read')
findOne(
  @Param('id')
  id: string,

  @CurrentUser()
  user: AuthenticatedUser,
) {
  return this.targetsService.findOneScoped(
    id,
    user,
  );

}

  @Patch(':id')
  @Permissions('target.update')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateTargetDto,
  ) {
    return this.targetsService.update(
      id,
      dto,
    );
  }

  @Delete(':id')
  @Permissions('target.delete')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.targetsService.remove(
      id,
    );
  }

  // ==========================================================================
  // TARGET ASSIGNMENTS
  // ==========================================================================

  @Post('assignments')
  @Permissions('target.create')
  assign(
    @Body()
    dto: AssignTargetDto,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.targetsService.assign(
      dto,
      user,
    );
  }

  @Get(':id/assignments')
  @Permissions('target.read')
  findAssignments(
    @Param('id')
    id: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.targetsService.findAssignments(
      id,
      user,
    );
  }

  @Delete('assignments/:id')
  @Permissions('target.delete')
  removeAssignment(
    @Param('id')
    id: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.targetsService.removeAssignment(
      id,
      user,
    );
  }
}