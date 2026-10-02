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

  async findAll(
    query: AlertQueryDto,
    user: AuthenticatedUser,
  ) {
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

      orderBy: {
        detectedAt:
          'desc',
      },
    });
  }

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

  async acknowledge(
    id: string,
    user: AuthenticatedUser,
  ) {
    await this.findOne(
      id,
      user,
    );

    return this.prisma.alert.update({
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
  }

  async resolve(
    id: string,
    user: AuthenticatedUser,
  ) {
    await this.findOne(
      id,
      user,
    );

    return this.prisma.alert.update({
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
  }
}