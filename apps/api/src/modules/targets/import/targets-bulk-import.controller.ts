
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
import { TargetsBulkImportService } from './targets-bulk-import.service.js';

type CsvUpload = {
  buffer: Buffer;
  originalname: string;
  size: number;
};

@Controller('targets/bulk-import')
export class TargetsBulkImportController {
  constructor(
    private readonly importService: TargetsBulkImportService,
  ) {}

  @Get('template')
  @Permissions('target.create')
  template(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="targets-bulk-import-template.csv"',
    );

    return res.send(this.importService.getTemplate());
  }

  @Post('preview')
  @Permissions('target.create')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 1024 * 1024 },
    }),
  )
  preview(@UploadedFile() file?: CsvUpload) {
    return this.importService.preview(this.getBuffer(file));
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
    return this.importService.confirm(this.getBuffer(file), user);
  }

  private getBuffer(file?: CsvUpload): Buffer {
    if (!file?.buffer?.length) {
      throw new BadRequestException('CSV file is required');
    }

    if (!file.originalname.toLowerCase().endsWith('.csv')) {
      throw new BadRequestException('Only CSV files are accepted');
    }

    return file.buffer;
  }
}
