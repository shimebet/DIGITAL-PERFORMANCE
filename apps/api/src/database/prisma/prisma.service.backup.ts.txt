import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import { PrismaMariaDb } from '@prisma/adapter-mariadb';

import { PrismaClient } from '../../generated/prisma/client.js';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(configService: ConfigService) {
    // ==========================================================================
    // DATABASE CONFIGURATION
    // ==========================================================================

    const host = configService.getOrThrow<string>('DATABASE_HOST');

    const port = Number(configService.get<string>('DATABASE_PORT', '3306'));

    const user = configService.getOrThrow<string>('DATABASE_USER');

    const password = configService.getOrThrow<string>('DATABASE_PASSWORD');

    const database = configService.getOrThrow<string>('DATABASE_NAME');

    const connectionLimit = Number(
      configService.get<string>('DATABASE_CONNECTION_LIMIT', '10'),
    );

    // ==========================================================================
    // PRISMA DRIVER ADAPTER
    // ==========================================================================

    const adapter = new PrismaMariaDb({
      host,
      port,
      user,
      password,
      database,
      connectionLimit,
    });

    super({
      adapter,
    });
  }

  // ==========================================================================
  // MODULE INIT
  // ==========================================================================

  async onModuleInit() {
    await this.$connect();

    // ------------------------------------------------------------------------
    // DEVELOPMENT DATABASE DIAGNOSTIC
    //
    // This confirms which MySQL database the running Nest application is
    // actually connected to.
    // ------------------------------------------------------------------------

    try {
      const databaseResult = await this.$queryRaw<
        Array<{
          databaseName: string | null;
        }>
      >`
          SELECT DATABASE() AS databaseName
        `;

      console.log('Prisma connected database:', databaseResult);
    } catch (error) {
      console.error('Unable to verify Prisma database connection:', error);
    }
  }

  // ==========================================================================
  // MODULE DESTROY
  // ==========================================================================

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
