import {
  Module,
} from '@nestjs/common';

import {
  AuthModule,
} from '../auth/auth.module.js';

import {
  DistrictsController,
} from './districts.controller.js';

import {
  DistrictsService,
} from './districts.service.js';

@Module({
  imports: [
    AuthModule,
  ],

  controllers: [
    DistrictsController,
  ],

  providers: [
    DistrictsService,
  ],

  exports: [
    DistrictsService,
  ],
})
export class DistrictsModule {}