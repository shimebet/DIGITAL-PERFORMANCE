import { readFileSync } from 'node:fs';

import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import {
  ConfigService,
} from '@nestjs/config';

import {
  PrismaMariaDb,
} from '@prisma/adapter-mariadb';

import {
  PrismaClient,
} from '../../generated/prisma/client.js';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger =
    new Logger(PrismaService.name);

  private readonly isProduction: boolean;

  constructor(configService: ConfigService) {
    const nodeEnv =
      configService.get<string>(
        'NODE_ENV',
        'development',
      );

    const isProduction =
      nodeEnv === 'production';

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
      if (
  nodeEnv === 'test' &&
  database !== 'digital_performance_test'
) {
  throw new Error(
    'Test environment must use digital_performance_test',
  );
}

    const connectionLimit = Number(
      configService.get<string>(
        'DATABASE_CONNECTION_LIMIT',
        '10',
      ),
    );

    if (
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65535
    ) {
      throw new Error(
        'Invalid DATABASE_PORT',
      );
    }

    if (
      !Number.isInteger(connectionLimit) ||
      connectionLimit < 1
    ) {
      throw new Error(
        'Invalid DATABASE_CONNECTION_LIMIT',
      );
    }

const adapter = new PrismaMariaDb({
  host,
  port,
  user,
  password,
  database,
  connectionLimit,

  // Require an encrypted, certificate-verified
  // database connection in production.
...(isProduction
  ? {
      ssl: {
        ca: readFileSync(
          configService.getOrThrow<string>(
            'DATABASE_SSL_CA_PATH',
          ),
          'utf8',
        ),
        rejectUnauthorized: true,
      },
    }
  : {}),

  // Preserve existing local development behavior.
  allowPublicKeyRetrieval:
    !isProduction,
});

    super({
      adapter,
    });

    this.isProduction = isProduction;
  }

  async onModuleInit() {
    await this.$connect();

    this.logger.log(
      'Prisma database connection established',
    );

    // Database-name diagnostics are development-only.
    if (!this.isProduction) {
      try {
        const result = await this.$queryRaw<
          Array<{
            databaseName: string | null;
          }>
        >`
          SELECT DATABASE() AS databaseName
        `;

        this.logger.debug(
          `Connected database: ${
            result[0]?.databaseName ?? 'unknown'
          }`,
        );
      } catch {
        this.logger.warn(
          'Unable to read database diagnostic information',
        );
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();

    this.logger.log(
      'Prisma database connection closed',
    );
  }
}