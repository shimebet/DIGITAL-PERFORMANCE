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
  AiController,
} from './ai.controller.js';

import {
  AiService,
} from './ai.service.js';

import {
  RulesAiProvider,
} from './providers/rules-ai.provider.js';

@Module({
  imports: [
    AuthModule,
    PerformanceModule,
  ],

  controllers: [
    AiController,
  ],

  providers: [
    AiService,
    RulesAiProvider,
  ],

  exports: [
    AiService,
    RulesAiProvider,
  ],
})
export class AiModule {}