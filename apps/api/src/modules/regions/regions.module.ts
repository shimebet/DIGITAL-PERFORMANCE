import {
  Module,
} from '@nestjs/common';

import {
  AuthModule,
} from '../auth/auth.module.js';

import {
  RegionsController,
} from './regions.controller.js';

import {
  RegionsService,
} from './regions.service.js';

@Module({
  imports: [
    AuthModule,
  ],

  controllers: [
    RegionsController,
  ],

  providers: [
    RegionsService,
  ],

  exports: [
    RegionsService,
  ],
})
export class RegionsModule {}