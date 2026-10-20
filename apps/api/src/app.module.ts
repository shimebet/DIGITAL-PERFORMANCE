import {
  Module,
} from '@nestjs/common';

import {
  ConfigModule,
} from '@nestjs/config';

import {
  APP_GUARD,
} from '@nestjs/core';

import {
  ScheduleModule,
} from '@nestjs/schedule';
import {
  ThrottlerModule,
  ThrottlerGuard,
} from '@nestjs/throttler';
import {
  AppController,
} from './app.controller.js';

import {
  AppService,
} from './app.service.js';

import appConfig from './config/app.config.js';

import {
  PrismaModule,
} from './database/prisma/prisma.module.js';

// ============================================================================
// AUTHENTICATION / AUTHORIZATION
// ============================================================================

import {
  AuthModule,
} from './modules/auth/auth.module.js';

import {
  JwtAuthGuard,
} from './modules/auth/guards/jwt-auth.guard.js';

import {
  PermissionsGuard,
} from './modules/auth/guards/permissions.guard.js';

// ============================================================================
// ORGANIZATION STRUCTURE
// ============================================================================

import {
  RegionsModule,
} from './modules/regions/regions.module.js';

import {
  DistrictsModule,
} from './modules/districts/districts.module.js';

import {
  BranchesModule,
} from './modules/branches/branches.module.js';

// ============================================================================
// USERS / RBAC
// ============================================================================

import {
  UsersModule,
} from './modules/users/users.module.js';

import {
  RolesModule,
} from './modules/roles/roles.module.js';

import {
  PermissionsModule,
} from './modules/permissions/permissions.module.js';

import {
  UserRolesModule,
} from './modules/user-roles/user-roles.module.js';

// ============================================================================
// BUSINESS MODULES
// ============================================================================

import {
  ProductsModule,
} from './modules/products/products.module.js';

import {
  TargetsModule,
} from './modules/targets/targets.module.js';

import {
  SubmissionsModule,
} from './modules/submissions/submissions.module.js';

import {
  ActivitiesModule,
} from './modules/activities/activities.module.js';

import {
  FollowUpsModule,
} from './modules/follow-ups/follow-ups.module.js';

// ============================================================================
// ANALYTICS / MANAGEMENT
// ============================================================================

import {
  PerformanceModule,
} from './modules/performance/performance.module.js';

import {
  DashboardModule,
} from './modules/dashboard/dashboard.module.js';

import {
  AlertsModule,
} from './modules/alerts/alerts.module.js';

import {
  AiModule,
} from './modules/ai/ai.module.js';

import {
  ReportsModule,
} from './modules/reports/reports.module.js';
import { PasswordChangeGuard } from './modules/auth/guards/password-change.guard.js';

@Module({
  imports: [
    // ========================================================================
    // GLOBAL CONFIGURATION
    // ========================================================================

    ConfigModule.forRoot({
      isGlobal:
        true,

      cache:
        true,

      load: [
        appConfig,
      ],
    }),

    // ========================================================================
    // SCHEDULER
    // Required by AlertJobsService / @Cron()
    // ========================================================================

    ScheduleModule.forRoot(),
// ========================================================================
// HTTP RATE LIMITING
// ========================================================================

ThrottlerModule.forRoot([
  {
    ttl: 60_000,
    limit: 100,
  },
]),
    // ========================================================================
    // DATABASE
    // ========================================================================

    PrismaModule,

    // ========================================================================
    // AUTHENTICATION MUST BE LOADED
    // ========================================================================

    AuthModule,

    // ========================================================================
    // ORGANIZATION
    // ========================================================================

    RegionsModule,
    DistrictsModule,
    BranchesModule,

    // ========================================================================
    // USERS / RBAC
    // ========================================================================

    UsersModule,
    RolesModule,
    PermissionsModule,
    UserRolesModule,

    // ========================================================================
    // DIGITAL BUSINESS
    // ========================================================================

    ProductsModule,
    TargetsModule,
    SubmissionsModule,
    ActivitiesModule,
    FollowUpsModule,

    // ========================================================================
    // PERFORMANCE / MANAGEMENT
    // ========================================================================

    PerformanceModule,
    DashboardModule,
    AlertsModule,
    AiModule,
    ReportsModule,
  ],

  controllers: [
    AppController,
  ],

  providers: [
    AppService,

    // ========================================================================
    // GLOBAL AUTHENTICATION GUARD
    //
    // Runs FIRST.
    //
    // Bearer JWT
    //      ↓
    // JwtStrategy.validate()
    //      ↓
    // request.user
    //
    // This is required before @CurrentUser() can work.
    // ========================================================================

    {
      provide:
        APP_GUARD,

      useClass:
        JwtAuthGuard,
    },
{
  provide: APP_GUARD,
  useClass: PasswordChangeGuard,
},
    // ========================================================================
    // GLOBAL PERMISSION GUARD
    //
    // Runs AFTER JwtAuthGuard so request.user already exists.
    //
    // request.user
    //      ↓
    // @Permissions(...)
    //      ↓
    // permission validation
    // ========================================================================
{
  provide: APP_GUARD,
  useClass: ThrottlerGuard,
},
    {
      provide:
        APP_GUARD,

      useClass:
        PermissionsGuard,
    },
  ],
})
export class AppModule {}