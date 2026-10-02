import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import { PrismaMariaDb } from '@prisma/adapter-mariadb';

import { PrismaClient } from '../../generated/prisma/client.js';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    configService: ConfigService,
  ) {
    const host =
      configService.getOrThrow<string>(
        'DATABASE_HOST',
      );

    const port = Number(
      configService.get<string>(
        'DATABASE_PORT',
        '3306',
      ),
    );

    const user =
      configService.getOrThrow<string>(
        'DATABASE_USER',
      );

    const password =
      configService.getOrThrow<string>(
        'DATABASE_PASSWORD',
      );

    const database =
      configService.getOrThrow<string>(
        'DATABASE_NAME',
      );

    const connectionLimit = Number(
      configService.get<string>(
        'DATABASE_CONNECTION_LIMIT',
        '10',
      ),
    );

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

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}