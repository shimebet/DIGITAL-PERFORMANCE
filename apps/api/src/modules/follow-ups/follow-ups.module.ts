import {
  Module,
} from '@nestjs/common';

import {
  AuthModule,
} from '../auth/auth.module.js';

import {
  FollowUpsController,
} from './follow-ups.controller.js';

import {
  FollowUpsService,
} from './follow-ups.service.js';

@Module({
  imports: [
    AuthModule,
  ],

  controllers: [
    FollowUpsController,
  ],

  providers: [
    FollowUpsService,
  ],

  exports: [
    FollowUpsService,
  ],
})
export class FollowUpsModule {}