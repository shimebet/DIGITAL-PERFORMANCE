
import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';

import { Permissions } from '../../auth/decorators/permissions.decorator.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';

import { TargetsImportService } from './targets-import.service.js';
import { TARGET_ASSIGNMENT_IMPORT_COLUMNS } from './targets-import.types.js';

interface CsvUpload {
  buffer: Buffer;
  size: number;
  originalname: string;
}

@Controller('targets/import')
export class TargetsImportController {
  constructor(
    private readonly importService: TargetsImportService,
  ) {}

  @Get('template')
  @Permissions('target.create')
  downloadTemplate(@Res() res: Response) {
    const csv =
      TARGET_ASSIGNMENT_IMPORT_COLUMNS.join(',') + '\r\n';

    res.setHeader(
      'Content-Type',
      'text/csv; charset=utf-8',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="target-assignments-template.csv"',
    );

    return res.send('\uFEFF' + csv);
  }

  @Post('preview')
  @Permissions('target.create')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 1024 * 1024 },
    }),
  )
  preview(
    @UploadedFile() file: CsvUpload | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const buffer = this.getValidatedBuffer(file);
    return this.importService.preview(buffer, user);
  }

  @Post('confirm')
  @Permissions('target.create')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 1024 * 1024 },
    }),
  )
  confirm(
    @UploadedFile() file: CsvUpload | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const buffer = this.getValidatedBuffer(file);
    return this.importService.confirm(buffer, user);
  }

  private getValidatedBuffer(
    file: CsvUpload | undefined,
  ): Buffer {
    if (!file?.buffer?.length) {
      throw new BadRequestException('CSV file is required.');
    }

    if (!file.originalname.toLowerCase().endsWith('.csv')) {
      throw new BadRequestException('Only CSV files are accepted.');
    }

    if (file.size > 1024 * 1024) {
      throw new BadRequestException(
        'CSV file exceeds the 1 MB limit.',
      );
    }

    return file.buffer;
  }
}
