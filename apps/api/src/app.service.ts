
import { Injectable } from '@nestjs/common';

import { PrismaService } from './database/prisma/prisma.service.js';

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async getHealth() {
    const databaseCheck =
      await this.prisma.$queryRaw<
        Array<{ result: number | bigint }>
      >`
        SELECT 1 AS result
      `;

    const databaseConnected =
      databaseCheck?.[0]?.result != null &&
      Number(databaseCheck[0].result) === 1;

    return {
      success: true,
      application: 'Digital Performance Monitoring Platform',
      service: 'API',
      status: 'running',

      database: {
        status: databaseConnected
          ? 'connected'
          : 'unknown',
      },

      timestamp: new Date().toISOString(),
    };
  }
}
