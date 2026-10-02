import {
  Module,
} from '@nestjs/common';

import {
  AuthModule,
} from '../auth/auth.module.js';

import {
  TargetsController,
} from './targets.controller.js';

import {
  TargetsService,
} from './targets.service.js';

@Module({
  imports: [
    AuthModule,
  ],

  controllers: [
    TargetsController,
  ],

  providers: [
    TargetsService,
  ],

  exports: [
    TargetsService,
  ],
})
export class TargetsModule {}