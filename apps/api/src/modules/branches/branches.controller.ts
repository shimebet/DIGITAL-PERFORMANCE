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
  BranchesService,
} from './branches.service.js';

import {
  CreateBranchDto,
} from './dto/create-branch.dto.js';

import {
  UpdateBranchDto,
} from './dto/update-branch.dto.js';

import {
  Permissions,
} from '../auth/decorators/permissions.decorator.js';

import {
  CurrentUser,
} from '../auth/decorators/current-user.decorator.js';

import type {
  AuthenticatedUser,
} from '../auth/interfaces/authenticated-user.interface.js';

@Controller('branches')
export class BranchesController {
  constructor(
    private readonly branchesService:
      BranchesService,
  ) {}

  // --------------------------------------------------------------------------
  // CREATE
  // --------------------------------------------------------------------------

  @Post()
  @Permissions('branch.create')
  create(
    @Body()
    dto: CreateBranchDto,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.branchesService.createScoped(
      dto,
      user,
    );
  }

  // --------------------------------------------------------------------------
  // FIND ALL
  // --------------------------------------------------------------------------

  @Get()
  @Permissions('branch.read')
  findAll(
    @Query('districtId')
    districtId: string | undefined,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.branchesService.findAllScoped(
      user,
      districtId,
    );
  }

  // --------------------------------------------------------------------------
  // FIND ONE
  // --------------------------------------------------------------------------

  @Get(':id')
  @Permissions('branch.read')
  findOne(
    @Param('id')
    id: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.branchesService.findOneScoped(
      id,
      user,
    );
  }

  // --------------------------------------------------------------------------
  // UPDATE
  // --------------------------------------------------------------------------

  @Patch(':id')
  @Permissions('branch.update')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateBranchDto,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.branchesService.updateScoped(
      id,
      dto,
      user,
    );
  }

  // --------------------------------------------------------------------------
  // DELETE
  // --------------------------------------------------------------------------

  @Delete(':id')
  @Permissions('branch.delete')
  remove(
    @Param('id')
    id: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.branchesService.removeScoped(
      id,
      user,
    );
  }
}