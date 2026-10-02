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
  DashboardController,
} from './dashboard.controller.js';

import {
  DashboardService,
} from './dashboard.service.js';

@Module({
  imports: [
    AuthModule,
    PerformanceModule,
  ],

  controllers: [
    DashboardController,
  ],

  providers: [
    DashboardService,
  ],
})
export class DashboardModule {}