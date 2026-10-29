
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import type {} from 'multer';
import type { Response } from 'express';

import { ActivitiesService } from './activities.service.js';

import { ActivitiesImportService } from './import/activities-import.service.js';

import { ACTIVITY_IMPORT_COLUMNS } from './import/activities-import.types.js';

import { CreateActivityDto } from './dto/create-activity.dto.js';
import { UpdateActivityDto } from './dto/update-activity.dto.js';

import { Permissions } from '../auth/decorators/permissions.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';

const MAX_CSV_FILE_SIZE = 1024 * 1024;

@Controller('activities')
export class ActivitiesController {
constructor(
  private readonly activitiesService: ActivitiesService,
  private readonly activitiesImportService: ActivitiesImportService,
) {}

  // ============================================================
  // CSV TEMPLATE DOWNLOAD
  // ============================================================

  @Get('import/template')
  @Permissions('activity.create')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header(
    'Content-Disposition',
    'attachment; filename="activities-import-template.csv"',
  )
  downloadImportTemplate(
    @Res() response: Response,
  ) {
    const header = ACTIVITY_IMPORT_COLUMNS.join(',');

    // Header-only template: users add their own activity rows.
    // UTF-8 BOM improves compatibility with Microsoft Excel.
    const csv = '\uFEFF' + header + '\r\n';

    return response.status(200).send(csv);
  }

  // ============================================================
  // CSV PREVIEW - NO DATABASE WRITES
  // ============================================================

  @Post('import/preview')
  @Permissions('activity.create')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: MAX_CSV_FILE_SIZE,
        files: 1,
      },
    }),
  )
  previewImport(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException(
        'Please upload a non-empty CSV file using the file field',
      );
    }

    if (!file.originalname.toLowerCase().endsWith('.csv')) {
      throw new BadRequestException(
        'Only CSV files are supported',
      );
    }

    return this.activitiesImportService.preview(
      file.buffer,
      user,
    );
  }

  // ============================================================
  // CSV CONFIRM - ATOMIC DATABASE IMPORT
  // ============================================================

  @Post('import/confirm')
  @Permissions('activity.create')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: MAX_CSV_FILE_SIZE,
        files: 1,
      },
    }),
  )
  confirmImport(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException(
        'Please upload a non-empty CSV file using the file field',
      );
    }

    if (!file.originalname.toLowerCase().endsWith('.csv')) {
      throw new BadRequestException(
        'Only CSV files are supported',
      );
    }

    return this.activitiesImportService.confirm(
      file.buffer,
      user,
    );
  }

  // ============================================================
  // EXISTING ACTIVITY CREATE
  // ============================================================

  @Post()
  @Permissions('activity.create')
  create(
    @Body() dto: CreateActivityDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.activitiesService.create(
      dto,
      user,
    );
  }

  // ============================================================
  // EXISTING MY ACTIVITIES
  // ============================================================

  @Get('mine')
  @Permissions('activity.read')
  findMine(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.activitiesService.findMine(
      user,
    );
  }

  // ============================================================
  // EXISTING ACTIVITY DETAILS
  // ============================================================

  @Get(':id')
  @Permissions('activity.read')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.activitiesService.findOne(
      id,
      user,
    );
  }

  // ============================================================
  // EXISTING ACTIVITY UPDATE
  // ============================================================

  @Patch(':id')
  @Permissions('activity.update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateActivityDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.activitiesService.update(
      id,
      dto,
      user,
    );
  }
}
