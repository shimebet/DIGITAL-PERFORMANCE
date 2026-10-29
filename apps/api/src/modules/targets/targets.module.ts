
import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';

import { TargetsController } from './targets.controller.js';
import { TargetsService } from './targets.service.js';

import { TargetsImportController } from './import/targets-import.controller.js';
import { TargetsImportService } from './import/targets-import.service.js';

import { TargetsBulkImportController } from './import/targets-bulk-import.controller.js';
import { TargetsBulkImportService } from './import/targets-bulk-import.service.js';

@Module({
  imports: [AuthModule],

  controllers: [
    TargetsBulkImportController,
    TargetsImportController,
    TargetsController,
  ],

  providers: [
    TargetsService,
    TargetsImportService,
    TargetsBulkImportService,
  ],

  exports: [TargetsService],
})
export class TargetsModule {}
