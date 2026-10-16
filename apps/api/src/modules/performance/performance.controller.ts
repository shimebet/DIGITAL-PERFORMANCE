import { Controller, Get, Query } from '@nestjs/common';

import { PerformanceService } from './performance.service.js';

import { PerformanceQueryDto } from './dto/performance-query.dto.js';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

import { Permissions } from '../auth/decorators/permissions.decorator.js';

import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';

@Controller('performance')
export class PerformanceController {
  constructor(private readonly performanceService: PerformanceService) {}
  // ==========================================================================
  // STAFF OPTIONS FOR REPORT FILTER
  // ==========================================================================

  @Get('staff-options')
  @Permissions('report.read')
  staffOptions(
    @Query('branchId')
    branchId: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.performanceService.staffOptions(
      branchId,
      user,
    );
  }
  // ==========================================================================
  // PERFORMANCE SUMMARY
  // ==========================================================================

  @Get('summary')
  @Permissions('dashboard.read')
  summary(
    @Query()
    query: PerformanceQueryDto,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.performanceService.summary(query, user);
  }

  // ==========================================================================
  // DAILY PERFORMANCE TREND
  // ==========================================================================

  @Get('trend/daily')
  @Permissions('dashboard.read')
  dailyTrend(
    @Query()
    query: PerformanceQueryDto,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.performanceService.dailyTrend(query, user);
  }

  // ==========================================================================
  // PRODUCT PERFORMANCE
  // ==========================================================================

  @Get('products')
  @Permissions('dashboard.read')
  productComparison(
    @Query()
    query: PerformanceQueryDto,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.performanceService.productComparison(query, user);
  }

  // ==========================================================================
  // BRANCH PERFORMANCE RANKING
  //
  // Returns branch-level performance ordered by achievement.
  //
  // Scope security remains enforced inside PerformanceService.
  // ==========================================================================

  @Get('rankings/branches')
  @Permissions('dashboard.read')
  branchRanking(
    @Query()
    query: PerformanceQueryDto,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.performanceService.branchRanking(query, user);
  }

  // ==========================================================================
  // STAFF PERFORMANCE RANKING
  //
  // Returns staff-level performance ordered by achievement.
  //
  // Digital Reskilled Staff remain restricted to themselves.
  // Managers only see staff inside their authorized scope.
  // ==========================================================================

  @Get('rankings/staff')
  @Permissions('dashboard.read')
  staffRanking(
    @Query()
    query: PerformanceQueryDto,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.performanceService.staffRanking(query, user);
  }
}