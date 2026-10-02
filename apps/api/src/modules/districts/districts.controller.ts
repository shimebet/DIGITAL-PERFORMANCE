import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import {
  DistrictsService,
} from './districts.service.js';

import {
  CreateDistrictDto,
} from './dto/create-district.dto.js';

import {
  UpdateDistrictDto,
} from './dto/update-district.dto.js';

import {
  Permissions,
} from '../auth/decorators/permissions.decorator.js';

import {
  CurrentUser,
} from '../auth/decorators/current-user.decorator.js';

import type {
  AuthenticatedUser,
} from '../auth/interfaces/authenticated-user.interface.js';

@Controller('districts')
export class DistrictsController {
  constructor(
    private readonly districtsService:
      DistrictsService,
  ) {}

  // --------------------------------------------------------------------------
  // CREATE
  // --------------------------------------------------------------------------

  @Post()
  @Permissions('district.create')
  create(
    @Body()
    dto: CreateDistrictDto,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.districtsService.createScoped(
      dto,
      user,
    );
  }

  // --------------------------------------------------------------------------
  // FIND ALL
  // --------------------------------------------------------------------------

  @Get()
  @Permissions('district.read')
  findAll(
    @Query('regionId')
    regionId: string | undefined,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.districtsService.findAllScoped(
      user,
      regionId,
    );
  }

  // --------------------------------------------------------------------------
  // FIND ONE
  // --------------------------------------------------------------------------

  @Get(':id')
  @Permissions('district.read')
  findOne(
    @Param('id')
    id: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.districtsService.findOneScoped(
      id,
      user,
    );
  }

  // --------------------------------------------------------------------------
  // UPDATE
  // --------------------------------------------------------------------------

  @Patch(':id')
  @Permissions('district.update')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateDistrictDto,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.districtsService.updateScoped(
      id,
      dto,
      user,
    );
  }

  // --------------------------------------------------------------------------
  // DELETE
  // --------------------------------------------------------------------------

  @Delete(':id')
  @Permissions('district.delete')
  remove(
    @Param('id')
    id: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.districtsService.removeScoped(
      id,
      user,
    );
  }
}