
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
  // ============================================================
  // LOGGER
  // ============================================================

  const logger = new Logger('Bootstrap');

  // ============================================================
  // ENVIRONMENT CONFIGURATION
  // ============================================================

  // In local development, load environment variables from .env.
  // On Render, environment variables are supplied by the platform.

  if (process.env.NODE_ENV !== 'production') {
    try {
      process.loadEnvFile('.env');
    } catch (error) {
      if (
        (error as NodeJS.ErrnoException).code !== 'ENOENT'
      ) {
        throw error;
      }
    }
  }

  const isProduction =
    process.env.NODE_ENV === 'production';

  // ============================================================
  // SERVER CONFIGURATION
  // ============================================================

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

  // ============================================================
  // CREATE NESTJS APPLICATION
  // ============================================================

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
  // CORS - WEBSITE AND CAPACITOR ANDROID
  // ============================================================

  // Website origins are configured in Render using CORS_ORIGINS.
  // Multiple origins must be separated by commas.
  //
  // Example:
  // CORS_ORIGINS=https://dpmp-web.onrender.com
  //
  // Android uses the same production API, but its Capacitor
  // WebView normally has the origin https://localhost.

  const configuredOrigins =
    process.env.CORS_ORIGINS ??
    'http://localhost:5173';

  const allowedOrigins = configuredOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const capacitorAndroidOrigin = 'https://localhost';

  // Reject wildcards, malformed origins, and unapproved
  // local addresses in production.
  //
  // The exact Capacitor Android origin is explicitly allowed.

  if (isProduction) {
    const invalidOrigins = allowedOrigins.filter(
      (origin) => {
        if (origin === '*') {
          return true;
        }

        if (origin === capacitorAndroidOrigin) {
          return false;
        }

        try {
          const parsed = new URL(origin);

          if (
            parsed.protocol !== 'https:' ||
            parsed.username ||
            parsed.password ||
            parsed.pathname !== '/' ||
            parsed.search !== '' ||
            parsed.hash !== ''
          ) {
            return true;
          }

          const hostname =
            parsed.hostname.toLowerCase();

          return (
            hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname === '[::1]' ||
            hostname.endsWith('.localhost')
          );
        } catch {
          return true;
        }
      },
    );

    if (invalidOrigins.length > 0) {
      throw new Error(
        'Production CORS_ORIGINS contains an invalid or unapproved origin.',
      );
    }
  }

  // Preserve website origins and add the Capacitor origin
  // only when running in production.
  //
  // No wildcard origins are used.

  const effectiveOrigins = [
    ...new Set([
      ...allowedOrigins,
      ...(isProduction
        ? [capacitorAndroidOrigin]
        : []),
    ]),
  ];

  app.enableCors({
    origin: effectiveOrigins,
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

  logger.log(
    `CORS configured for ${effectiveOrigins.length} approved origin(s)`,
  );

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
      'Swagger enabled at /api/docs',
    );
  }
}

// ============================================================
// APPLICATION STARTUP ERROR HANDLING
// ============================================================

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
