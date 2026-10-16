import {
  Module,
} from '@nestjs/common';

import {
  AuthModule,
} from '../auth/auth.module.js';

import {
  PerformanceModule,
} from '../performance/performance.module.js';

import {
  ReportsController,
} from './reports.controller.js';

import {
  ReportsService,
} from './reports.service.js';
import {
  SavedReportsService,
} from './saved-reports.service.js';

import {
  ReportAuditService,
} from './report-audit.service.js';
import {
  SavedReportsController,
} from './saved-reports.controller.js';


@Module({
  imports: [
    AuthModule,
    PerformanceModule,
  ],

controllers: [
  ReportsController,
  SavedReportsController,
],

providers: [
  ReportsService,
  SavedReportsService,
  ReportAuditService,
],

  exports: [
    ReportsService,
  ],
})
export class ReportsModule {}