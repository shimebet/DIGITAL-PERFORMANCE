
import { Module } from '@nestjs/common';

import { ActivitiesController } from './activities.controller.js';
import { ActivitiesService } from './activities.service.js';
import { ActivitiesImportService } from './import/activities-import.service.js';

@Module({
  controllers: [ActivitiesController],
  providers: [
    ActivitiesService,
    ActivitiesImportService,
  ],
  exports: [
    ActivitiesService,
    ActivitiesImportService,
  ],
})
export class ActivitiesModule {}
