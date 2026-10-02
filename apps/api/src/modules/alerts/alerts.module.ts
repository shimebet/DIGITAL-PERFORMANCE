import {
  Module,
} from '@nestjs/common';

import {
  AuthModule,
} from '../auth/auth.module.js';

import {
  AlertsController,
} from './alerts.controller.js';

import {
  AlertsService,
} from './alerts.service.js';

import {
  AlertDetectionService,
} from './alert-detection.service.js';
import {
  AlertJobsService,
} from './alert-jobs.service.js';

@Module({
  imports: [
    AuthModule,
  ],

  controllers: [
    AlertsController,
  ],

  providers: [
    AlertsService,
    AlertDetectionService,
    AlertJobsService,
  ],

  exports: [
    AlertsService,
    AlertDetectionService,
  ],
})
export class AlertsModule {}