import {
  Controller,
  Get,
  Query,
} from '@nestjs/common';

import {
  PerformanceService,
} from './performance.service.js';

import {
  PerformanceQueryDto,
} from './dto/performance-query.dto.js';

import {
  CurrentUser,
} from '../auth/decorators/current-user.decorator.js';

import {
  Permissions,
} from '../auth/decorators/permissions.decorator.js';

import type {
  AuthenticatedUser,
} from '../auth/interfaces/authenticated-user.interface.js';

@Controller('performance')
export class PerformanceController {
  constructor(
    private readonly performanceService:
      PerformanceService,
  ) {}

  @Get('summary')
  @Permissions('report.read')
  summary(
    @Query()
    query: PerformanceQueryDto,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.performanceService.summary(
      query,
      user,
    );
  }
@Get('trend/daily')
@Permissions('report.read')
dailyTrend(
  @Query()
  query: PerformanceQueryDto,

  @CurrentUser()
  user: AuthenticatedUser,
) {
  return this.performanceService.dailyTrend(
    query,
    user,
  );
}

@Get('products')
@Permissions('report.read')
productComparison(
  @Query()
  query: PerformanceQueryDto,

  @CurrentUser()
  user: AuthenticatedUser,
) {
  return this.performanceService.productComparison(
    query,
    user,
  );
}


}