import {
  Controller,
  Get,
  Query,
} from '@nestjs/common';

import {
  DashboardService,
} from './dashboard.service.js';

import {
  DashboardQueryDto,
} from './dto/dashboard-query.dto.js';

import {
  CurrentUser,
} from '../auth/decorators/current-user.decorator.js';

import {
  Permissions,
} from '../auth/decorators/permissions.decorator.js';

import type {
  AuthenticatedUser,
} from '../auth/interfaces/authenticated-user.interface.js';

@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService:
      DashboardService,
  ) {}

  @Get('overview')
  @Permissions('dashboard.read')
  overview(
    @Query()
    query: DashboardQueryDto,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.dashboardService.overview(
      query,
      user,
    );
  }

  @Get('branches')
  @Permissions('dashboard.read')
  branchRanking(
    @Query()
    query: DashboardQueryDto,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.dashboardService.branchRanking(
      query,
      user,
    );
  }
}