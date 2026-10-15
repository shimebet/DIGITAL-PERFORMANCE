// src/modules/ai/ai.controller.ts

import {
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';

import {
  AiService,
} from './ai.service.js';

import {
  AiQueryDto,
} from './dto/ai-query.dto.js';

import {
  ManagementQueryDto,
} from './dto/management-query.dto.js';

import {
  CurrentUser,
} from '../auth/decorators/current-user.decorator.js';

import {
  Permissions,
} from '../auth/decorators/permissions.decorator.js';

import type {
  AuthenticatedUser,
} from '../auth/interfaces/authenticated-user.interface.js';

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService:
      AiService,
  ) {}

  // ==========================================================================
  // GENERATE INSIGHTS
  // ==========================================================================

  @Post('generate')
  @Permissions('ai.read')
  generate(
    @Body()
    query: AiQueryDto,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.aiService.generateInsights(
      query,
      user,
    );
  }

  // ==========================================================================
  // STORED INSIGHTS
  // ==========================================================================

  @Get('insights')
  @Permissions('ai.read')
  insights(
    @Query()
    query: AiQueryDto,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.aiService.findAll(
      user,
      query,
    );
  }

  // ==========================================================================
  // MANAGEMENT SUMMARY
  // ==========================================================================

  @Get('summary')
  @Permissions('ai.read')
  summary(
    @Query()
    query: AiQueryDto,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.aiService.managementSummary(
      query,
      user,
    );
  }

  // ==========================================================================
  // MANAGEMENT ANALYTICS QUERY
  // ==========================================================================

  @Post('query')
  @Permissions('ai.read')
  managementQuery(
    @Body()
    dto: ManagementQueryDto,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.aiService.managementQuery(
      dto,
      user,
    );
  }
}