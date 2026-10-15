import {
  Injectable,
} from '@nestjs/common';

import {
  PrismaService,
} from '../../database/prisma/prisma.service.js';

@Injectable()
export class AlertDetectionService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // ==========================================================================
  // MISSED DAILY SUBMISSION DETECTION
  // ==========================================================================

  async detectMissedSubmissions(
    date = new Date(),
  ) {
    const day =
      new Date(date);

    day.setHours(
      0,
      0,
      0,
      0,
    );

    const staff =
      await this.prisma.staffProfile.findMany({
        where: {
          status:
            'ACTIVE',

          digitalReskilled:
            true,

          user: {
            status:
              'ACTIVE',

            deletedAt:
              null,
          },
        },

        include: {
          user:
            true,

          branch: {
            include: {
              district: {
                include: {
                  region:
                    true,
                },
              },
            },
          },
        },
      });

    let generated = 0;

    for (const employee of staff) {
      const submission =
        await this.prisma.dailySubmission.findFirst({
          where: {
            staffId:
              employee.userId,

            branchId:
              employee.branchId,

            submissionDate:
              day,
          },
        });

      if (submission) {
        continue;
      }

      const existing =
        await this.prisma.alert.findFirst({
          where: {
            alertType:
              'MISSED_SUBMISSION',

            recipientUserId:
              employee.userId,

            branchId:
              employee.branchId,

            detectedAt: {
              gte:
                day,
            },
          },
        });

      if (existing) {
        continue;
      }

      await this.prisma.alert.create({
        data: {
          title:
            'Missed Daily Submission',

          message:
            `${employee.user.firstName} ${employee.user.lastName} has not submitted the daily digital activity report.`,

          severity:
            'MEDIUM',

          alertType:
            'MISSED_SUBMISSION',

          scopeType:
            'STAFF',

          regionId:
            employee.branch.district.regionId,

          districtId:
            employee.branch.districtId,

          branchId:
            employee.branchId,

          recipientUserId:
            employee.userId,

          metadata: {
            submissionDate:
              day.toISOString(),
          },
        },
      });

      generated++;
    }

    return {
      generated,
    };
  }

  // ==========================================================================
  // LOW CONVERSION DETECTION
  // ==========================================================================

  async detectLowConversion(
    date = new Date(),
  ) {
    const start =
      new Date(date);

    start.setHours(
      0,
      0,
      0,
      0,
    );

    const end =
      new Date(date);

    end.setHours(
      23,
      59,
      59,
      999,
    );

    const activities =
      await this.prisma.activity.findMany({
        where: {
          activityDate: {
            gte:
              start,

            lte:
              end,
          },
        },

        include: {
          branch: {
            include: {
              district: {
                include: {
                  region:
                    true,
                },
              },
            },
          },
        },
      });

    const branchMap =
      new Map<
        string,
        {
          visits: number;
          educated: number;
          activations: number;
          branch: typeof activities[number]['branch'];
        }
      >();

    for (const activity of activities) {
      const current =
        branchMap.get(
          activity.branchId,
        ) ?? {
          visits:
            0,

          educated:
            0,

          activations:
            0,

          branch:
            activity.branch,
        };

      current.visits +=
        activity.customerVisits;

      current.educated +=
        activity.customersEducated;

      current.activations +=
        activity.activations;

      branchMap.set(
        activity.branchId,
        current,
      );
    }

    let generated = 0;

    for (
      const [
        branchId,
        data,
      ] of branchMap
    ) {
      const conversionRate =
        data.educated > 0
          ? (
              data.activations /
              data.educated
            ) * 100
          : 0;

      if (
        data.visits >= 20 &&
        data.educated >= 10 &&
        conversionRate < 30
      ) {
        const existing =
          await this.prisma.alert.findFirst({
            where: {
              alertType:
                'HIGH_ACTIVITY_LOW_CONVERSION',

              branchId,

              detectedAt: {
                gte:
                  start,
              },
            },
          });

        if (existing) {
          continue;
        }

        await this.prisma.alert.create({
          data: {
            title:
              'High Activity / Low Conversion',

            message:
              `${data.branch.name} recorded high customer activity but low activation conversion.`,

            severity:
              'HIGH',

            alertType:
              'HIGH_ACTIVITY_LOW_CONVERSION',

            scopeType:
              'BRANCH',

            regionId:
              data.branch.district.regionId,

            districtId:
              data.branch.districtId,

            branchId,

            metadata: {
              visits:
                data.visits,

              educated:
                data.educated,

              activations:
                data.activations,

              conversionRate:
                Number(
                  conversionRate.toFixed(
                    2,
                  ),
                ),
            },
          },
        });

        generated++;
      }
    }

    return {
      generated,
    };
  }

  // ==========================================================================
  // OVERDUE FOLLOW-UP DETECTION
  // ==========================================================================

  async detectOverdueFollowUps() {
    const today =
      new Date();

    today.setHours(
      0,
      0,
      0,
      0,
    );

    const overdue =
      await this.prisma.followUp.findMany({
        where: {
          followUpDate: {
            lt:
              today,
          },

          status: {
            in: [
              'OPEN',
              'CONTACTED',
              'RESCHEDULED',
            ],
          },
        },

        include: {
          branch: {
            include: {
              district: {
                include: {
                  region:
                    true,
                },
              },
            },
          },

          assignedTo:
            true,
        },
      });

    let generated = 0;

    for (const item of overdue) {
      const existing =
        await this.prisma.alert.findFirst({
          where: {
            alertType:
              'OVERDUE_FOLLOW_UP',

            recipientUserId:
              item.assignedToUserId,

            metadata: {
              path:
                '$.followUpId',

              equals:
                item.id,
            },
          },
        });

      if (existing) {
        continue;
      }

      await this.prisma.alert.create({
        data: {
          title:
            'Overdue Customer Follow-up',

          message:
            `A customer follow-up assigned to ${item.assignedTo.firstName} ${item.assignedTo.lastName} is overdue.`,

          severity:
            'MEDIUM',

          alertType:
            'OVERDUE_FOLLOW_UP',

          scopeType:
            'STAFF',

          regionId:
            item.branch.district.regionId,

          districtId:
            item.branch.districtId,

          branchId:
            item.branchId,

          recipientUserId:
            item.assignedToUserId,

          metadata: {
            followUpId:
              item.id,

            followUpDate:
              item.followUpDate.toISOString(),
          },
        },
      });

      generated++;
    }

    return {
      generated,
    };
  }

  // ==========================================================================
  // RUN ALL ALERT DETECTION RULES
  // ==========================================================================

  async runAll() {
    const missed =
      await this.detectMissedSubmissions();

    const lowConversion =
      await this.detectLowConversion();

    const overdueFollowUps =
      await this.detectOverdueFollowUps();

    return {
      missedSubmissions:
        missed.generated,

      lowConversion:
        lowConversion.generated,

      overdueFollowUps:
        overdueFollowUps.generated,
    };
  }
}