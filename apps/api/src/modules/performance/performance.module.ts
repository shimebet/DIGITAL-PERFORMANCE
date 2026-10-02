import {
  Module,
} from '@nestjs/common';

import {
  AuthModule,
} from '../auth/auth.module.js';

import {
  PerformanceController,
} from './performance.controller.js';

import {
  PerformanceService,
} from './performance.service.js';

@Module({
  imports: [
    AuthModule,
  ],

  controllers: [
    PerformanceController,
  ],

  providers: [
    PerformanceService,
  ],

  exports: [
    PerformanceService,
  ],
})
export class PerformanceModule {}