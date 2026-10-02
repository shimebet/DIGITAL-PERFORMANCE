import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { RegionsService } from './regions.service.js';

import { CreateRegionDto } from './dto/create-region.dto.js';
import { UpdateRegionDto } from './dto/update-region.dto.js';

import {
  Permissions,
} from '../auth/decorators/permissions.decorator.js';

import {
  CurrentUser,
} from '../auth/decorators/current-user.decorator.js';

import type {
  AuthenticatedUser,
} from '../auth/interfaces/authenticated-user.interface.js';

@Controller('regions')
export class RegionsController {
  constructor(
    private readonly regionsService: RegionsService,
  ) {}

  // --------------------------------------------------------------------------
  // CREATE REGION
  // --------------------------------------------------------------------------

  @Post()
  @Permissions('region.create')
  create(
    @Body()
    dto: CreateRegionDto,
  ) {
    return this.regionsService.create(dto);
  }

  // --------------------------------------------------------------------------
  // GET REGIONS BASED ON USER SCOPE
  // --------------------------------------------------------------------------

  @Get()
  @Permissions('region.read')
  findAll(
    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.regionsService.findAllScoped(
      user,
    );
  }

  // --------------------------------------------------------------------------
  // GET ONE REGION
  // --------------------------------------------------------------------------

  @Get(':id')
  @Permissions('region.read')
  findOne(
    @Param('id')
    id: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.regionsService.findOneScoped(
      id,
      user,
    );
  }

  // --------------------------------------------------------------------------
  // UPDATE REGION
  // --------------------------------------------------------------------------

  @Patch(':id')
  @Permissions('region.update')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateRegionDto,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.regionsService.updateScoped(
      id,
      dto,
      user,
    );
  }

  // --------------------------------------------------------------------------
  // DELETE REGION
  // --------------------------------------------------------------------------

  @Delete(':id')
  @Permissions('region.delete')
  remove(
    @Param('id')
    id: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.regionsService.removeScoped(
      id,
      user,
    );
  }
}