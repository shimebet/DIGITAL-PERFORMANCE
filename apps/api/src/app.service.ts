import { Injectable } from '@nestjs/common';

import { PrismaService } from './database/prisma/prisma.service.js';

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async getHealth() {
    const databaseCheck =
      await this.prisma.$queryRaw<Array<{ result: number }>>`
        SELECT 1 AS result
      `;

    return {
      success: true,
      application: 'Digital Performance Monitoring Platform',
      service: 'API',
      status: 'running',

      database: {
        status:
          databaseCheck?.[0]?.result === 1
            ? 'connected'
            : 'unknown',
      },

      timestamp: new Date().toISOString(),
    };
  }
}