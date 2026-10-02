import {
  Injectable,
  Logger,
} from '@nestjs/common';

import {
  Cron,
} from '@nestjs/schedule';

import {
  AlertDetectionService,
} from './alert-detection.service.js';

@Injectable()
export class AlertJobsService {
  private readonly logger =
    new Logger(
      AlertJobsService.name,
    );

  constructor(
    private readonly detectionService:
      AlertDetectionService,
  ) {}

  // ============================================================
  // DAILY SUBMISSION CHECK
  // 6:30 PM Ethiopia time
  // ============================================================

  @Cron(
    '0 30 18 * * 1-6',
    {
      name:
        'daily-submission-check',

      timeZone:
        'Africa/Addis_Ababa',

      waitForCompletion:
        true,
    },
  )
  async checkDailySubmissions() {
    this.logger.log(
      'Running daily missed-submission detection...',
    );

    const result =
      await this.detectionService.detectMissedSubmissions();

    this.logger.log(
      `Missed submission alerts generated: ${result.generated}`,
    );
  }

  // ============================================================
  // OVERDUE FOLLOW-UP CHECK
  // 8:00 AM DAILY
  // ============================================================

  @Cron(
    '0 0 8 * * *',
    {
      name:
        'overdue-follow-up-check',

      timeZone:
        'Africa/Addis_Ababa',

      waitForCompletion:
        true,
    },
  )
  async checkOverdueFollowUps() {
    const result =
      await this.detectionService.detectOverdueFollowUps();

    this.logger.log(
      `Overdue follow-up alerts generated: ${result.generated}`,
    );
  }

  // ============================================================
  // LOW CONVERSION CHECK
  // 7:00 PM DAILY
  // ============================================================

  @Cron(
    '0 0 19 * * *',
    {
      name:
        'low-conversion-check',

      timeZone:
        'Africa/Addis_Ababa',

      waitForCompletion:
        true,
    },
  )
  async checkLowConversion() {
    const result =
      await this.detectionService.detectLowConversion();

    this.logger.log(
      `Low conversion alerts generated: ${result.generated}`,
    );
  }
}