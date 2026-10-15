import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  PrismaService,
} from '../../database/prisma/prisma.service.js';

import {
  ScopeService,
} from '../auth/services/scope.service.js';

import type {
  AuthenticatedUser,
} from '../auth/interfaces/authenticated-user.interface.js';

import {
  AlertQueryDto,
} from './dto/alert-query.dto.js';

@Injectable()
export class AlertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
  ) {}

  // ==========================================================================
  // LIST ALERTS
  // ==========================================================================

  async findAll(
    query: AlertQueryDto,
    user: AuthenticatedUser,
  ) {
    if (query.regionId) {
      await this.scopeService.assertRegionAccess(
        user,
        query.regionId,
      );
    }

    if (query.districtId) {
      await this.scopeService.assertDistrictAccess(
        user,
        query.districtId,
      );
    }

    if (query.branchId) {
      await this.scopeService.assertBranchAccess(
        user,
        query.branchId,
      );
    }

    const regionIds =
      this.scopeService.getRegionIds(
        user,
      );

    const districtIds =
      this.scopeService.getDistrictIds(
        user,
      );

    const branchIds =
      this.scopeService.getBranchIds(
        user,
      );

    const detectedAtFilter =
      query.startDate ||
      query.endDate
        ? {
            ...(query.startDate
              ? {
                  gte:
                    new Date(
                      `${query.startDate}T00:00:00.000`,
                    ),
                }
              : {}),

            ...(query.endDate
              ? {
                  lte:
                    new Date(
                      `${query.endDate}T23:59:59.999`,
                    ),
                }
              : {}),
          }
        : undefined;

    return this.prisma.alert.findMany({
      where: {
        ...(query.status
          ? {
              status:
                query.status,
            }
          : {}),

        ...(query.severity
          ? {
              severity:
                query.severity,
            }
          : {}),

        ...(query.regionId
          ? {
              regionId:
                query.regionId,
            }
          : {}),

        ...(query.districtId
          ? {
              districtId:
                query.districtId,
            }
          : {}),

        ...(query.branchId
          ? {
              branchId:
                query.branchId,
            }
          : {}),

        ...(query.productId
          ? {
              productId:
                query.productId,
            }
          : {}),

        ...(detectedAtFilter
          ? {
              detectedAt:
                detectedAtFilter,
            }
          : {}),

        ...(!this.scopeService.isGlobal(
          user,
        )
          ? {
              OR: [
                {
                  recipientUserId:
                    user.id,
                },

                ...(branchIds.length
                  ? [
                      {
                        branchId: {
                          in:
                            branchIds,
                        },
                      },
                    ]
                  : []),

                ...(districtIds.length
                  ? [
                      {
                        districtId: {
                          in:
                            districtIds,
                        },
                      },
                    ]
                  : []),

                ...(regionIds.length
                  ? [
                      {
                        regionId: {
                          in:
                            regionIds,
                        },
                      },
                    ]
                  : []),
              ],
            }
          : {}),
      },

      include: {
        region:
          true,

        district:
          true,

        branch:
          true,

        product:
          true,

        recipient: {
          select: {
            id:
              true,

            username:
              true,

            firstName:
              true,

            middleName:
              true,

            lastName:
              true,
          },
        },
      },

      orderBy: [
        {
          status:
            'asc',
        },

        {
          detectedAt:
            'desc',
        },
      ],
    });
  }

  // ==========================================================================
  // GET SINGLE ALERT
  // ==========================================================================

  async findOne(
    id: string,
    user: AuthenticatedUser,
  ) {
    const alert =
      await this.prisma.alert.findUnique({
        where: {
          id,
        },

        include: {
          region:
            true,

          district:
            true,

          branch:
            true,

          product:
            true,

          recipient:
            true,
        },
      });

    if (!alert) {
      throw new NotFoundException(
        'Alert not found',
      );
    }

    if (
      this.scopeService.isGlobal(
        user,
      )
    ) {
      return alert;
    }

    if (
      alert.recipientUserId ===
      user.id
    ) {
      return alert;
    }

    if (alert.branchId) {
      await this.scopeService.assertBranchAccess(
        user,
        alert.branchId,
      );

      return alert;
    }

    if (alert.districtId) {
      await this.scopeService.assertDistrictAccess(
        user,
        alert.districtId,
      );

      return alert;
    }

    if (alert.regionId) {
      await this.scopeService.assertRegionAccess(
        user,
        alert.regionId,
      );

      return alert;
    }

    throw new NotFoundException(
      'Alert not found',
    );
  }

  // ==========================================================================
  // ACKNOWLEDGE ALERT
  // ==========================================================================

  async acknowledge(
    id: string,
    user: AuthenticatedUser,
  ) {
    await this.findOne(
      id,
      user,
    );

    await this.prisma.alert.update({
      where: {
        id,
      },

      data: {
        status:
          'ACKNOWLEDGED',

        acknowledgedAt:
          new Date(),
      },
    });

    return this.findOne(
      id,
      user,
    );
  }

  // ==========================================================================
  // RESOLVE ALERT
  // ==========================================================================

  async resolve(
    id: string,
    user: AuthenticatedUser,
  ) {
    await this.findOne(
      id,
      user,
    );

    await this.prisma.alert.update({
      where: {
        id,
      },

      data: {
        status:
          'RESOLVED',

        resolvedAt:
          new Date(),
      },
    });

    return this.findOne(
      id,
      user,
    );
  }
}