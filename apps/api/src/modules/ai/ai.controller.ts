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

  @Post('generate')
  @Permissions('ai.manage')
  generate(
    @Query()
    query: AiQueryDto,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.aiService.generateInsights(
      query,
      user,
    );
  }

  @Get('insights')
  @Permissions('ai.read')
  findAll(
    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.aiService.findAll(
      user,
    );
  }

  @Get('summary')
  @Permissions('ai.read')
  managementSummary(
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

  @Post('query')
  @Permissions('ai.read')
  query(
    @Body()
    dto: ManagementQueryDto,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.aiService.managementQuery(
      dto.question,
      user,
    );
  }
}