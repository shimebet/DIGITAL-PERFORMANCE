import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';

import {
  SavedReportsService,
} from './saved-reports.service.js';

import {
  CreateSavedReportDto,
} from './dto/create-saved-report.dto.js';

import {
  UpdateSavedReportDto,
} from './dto/update-saved-report.dto.js';

import {
  CurrentUser,
} from '../auth/decorators/current-user.decorator.js';

import {
  Permissions,
} from '../auth/decorators/permissions.decorator.js';

import type {
  AuthenticatedUser,
} from '../auth/interfaces/authenticated-user.interface.js';

@Controller('reports/saved')
@Permissions('report.read')
export class SavedReportsController {
  constructor(
    private readonly savedReportsService:
      SavedReportsService,
  ) {}

  @Get()
  findAll(
    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.savedReportsService.findAll(user);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe)
    id: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.savedReportsService.findOne(
      id,
      user,
    );
  }

  @Post()
  create(
    @Body()
    dto: CreateSavedReportDto,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.savedReportsService.create(
      dto,
      user,
    );
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe)
    id: string,

    @Body()
    dto: UpdateSavedReportDto,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.savedReportsService.update(
      id,
      dto,
      user,
    );
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe)
    id: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.savedReportsService.remove(
      id,
      user,
    );
  }
    @Post(':id/run')
  run(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.savedReportsService.run(
      id,
      user,
    );
  }
}
