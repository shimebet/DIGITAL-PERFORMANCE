import {
  Logger,
  ValidationPipe,
} from '@nestjs/common';

import {
  NestFactory,
} from '@nestjs/core';

import {
  DocumentBuilder,
  SwaggerModule,
} from '@nestjs/swagger';

import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import {
  AppModule,
} from './app.module.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const isProduction =
    process.env.NODE_ENV === 'production';

  const port = Number(
    process.env.PORT ?? 3000,
  );

  const host =
    process.env.HOST ??
    '127.0.0.1';

  if (
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    throw new Error(
      'PORT must be an integer between 1 and 65535',
    );
  }

const app = await NestFactory.create(
  AppModule,
);

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================

app.enableShutdownHooks();

// ============================================================
// SECURITY HEADERS
// ============================================================

app.use(helmet());

app.use(cookieParser());

  // ============================================================
  // CORS
  // ============================================================

  const configuredOrigins =
    process.env.CORS_ORIGINS ??
    'http://localhost:5173';

  const allowedOrigins =
    configuredOrigins
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

  if (
    isProduction &&
    allowedOrigins.some(
      (origin) =>
        origin === '*' ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1'),
    )
  ) {
    throw new Error(
      'Production CORS_ORIGINS must contain approved application origins, not localhost or wildcard origins.',
    );
  }

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],
  });

  // ============================================================
  // API PREFIX
  // ============================================================

  app.setGlobalPrefix('api');

  // ============================================================
  // GLOBAL VALIDATION
  // ============================================================

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ============================================================
  // SWAGGER DOCUMENTATION
  // Disabled by default in production.
  // ============================================================

  const enableSwagger =
    process.env.ENABLE_SWAGGER === 'true' ||
    (
      !isProduction &&
      process.env.ENABLE_SWAGGER !== 'false'
    );

  if (enableSwagger) {
    const swaggerConfig =
      new DocumentBuilder()
        .setTitle(
          'Digital Performance Monitoring API',
        )
        .setDescription(
          'API for Digital Performance Monitoring Platform',
        )
        .setVersion('1.0')
        .addBearerAuth()
        .build();

    const document =
      SwaggerModule.createDocument(
        app,
        swaggerConfig,
      );

    SwaggerModule.setup(
      'api/docs',
      app,
      document,
    );
  }

  // ============================================================
  // START SERVER
  // ============================================================

  await app.listen(
    port,
    host,
  );

  logger.log(
    `Digital Performance API listening on ${host}:${port}/api`,
  );

  if (enableSwagger) {
    logger.log(
      `Swagger enabled at /api/docs`,
    );
  }
}

void bootstrap().catch((error: unknown) => {
  const logger = new Logger('Bootstrap');

  logger.error(
    'Application startup failed',
    error instanceof Error
      ? error.stack
      : String(error),
  );

  process.exitCode = 1;
});