import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import * as argon2 from 'argon2';

import { PrismaService } from '../../database/prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateUserDto) {
    const username = dto.username.trim().toLowerCase();

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username },
          ...(dto.email
            ? [{ email: dto.email.trim().toLowerCase() }]
            : []),
        ],
      },
    });

    if (existing) {
      throw new ConflictException(
        'Username or email already exists',
      );
    }

    if (dto.branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: {
          id: dto.branchId,
          deletedAt: null,
        },
      });

      if (!branch) {
        throw new NotFoundException(
          'Branch not found',
        );
      }
    }

    const passwordHash = await argon2.hash(
      dto.password,
    );

    return this.prisma.user.create({
      data: {
        username,
        email: dto.email?.trim().toLowerCase(),
        phone: dto.phone?.trim(),
        passwordHash,
        firstName: dto.firstName.trim(),
        middleName: dto.middleName?.trim(),
        lastName: dto.lastName.trim(),
        mustChangePassword: true,

        ...(dto.branchId
          ? {
              staffProfile: {
                create: {
                  branchId: dto.branchId,
                  employeeNumber:
                    dto.employeeNumber?.trim(),
                  jobTitle:
                    dto.jobTitle?.trim(),
                  digitalReskilled:
                    dto.digitalReskilled ?? true,
                },
              },
            }
          : {}),
      },

      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        firstName: true,
        middleName: true,
        lastName: true,
        status: true,
        createdAt: true,
        staffProfile: {
          include: {
            branch: {
              include: {
                district: {
                  include: {
                    region: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      where: {
        deletedAt: null,
      },

      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        firstName: true,
        middleName: true,
        lastName: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,

        staffProfile: {
          include: {
            branch: {
              include: {
                district: {
                  include: {
                    region: true,
                  },
                },
              },
            },
          },
        },

        roles: {
          include: {
            role: true,
            region: true,
            district: true,
            branch: true,
          },
        },
      },

      orderBy: {
        firstName: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },

      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        firstName: true,
        middleName: true,
        lastName: true,
        status: true,
        mfaEnabled: true,
        mustChangePassword: true,
        lastLoginAt: true,
        createdAt: true,

        staffProfile: {
          include: {
            branch: {
              include: {
                district: {
                  include: {
                    region: true,
                  },
                },
              },
            },
          },
        },

        roles: {
          include: {
            role: true,
            region: true,
            district: true,
            branch: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(
        'User not found',
      );
    }

    return user;
  }

  async update(
    id: string,
    dto: UpdateUserDto,
  ) {
    await this.findOne(id);

    if (dto.branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: {
          id: dto.branchId,
          deletedAt: null,
        },
      });

      if (!branch) {
        throw new NotFoundException(
          'Branch not found',
        );
      }
    }

    await this.prisma.user.update({
      where: {
        id,
      },

      data: {
        email: dto.email
          ?.trim()
          .toLowerCase(),
        phone: dto.phone?.trim(),
        firstName: dto.firstName?.trim(),
        middleName: dto.middleName?.trim(),
        lastName: dto.lastName?.trim(),
        status: dto.status,
      },
    });

    if (dto.branchId) {
      await this.prisma.staffProfile.upsert({
        where: {
          userId: id,
        },

        update: {
          branchId: dto.branchId,
          employeeNumber:
            dto.employeeNumber?.trim(),
          jobTitle: dto.jobTitle?.trim(),
        },

        create: {
          userId: id,
          branchId: dto.branchId,
          employeeNumber:
            dto.employeeNumber?.trim(),
          jobTitle: dto.jobTitle?.trim(),
        },
      });
    }

    return this.findOne(id);
  }

  async softDelete(id: string) {
    await this.findOne(id);

    return this.prisma.user.update({
      where: {
        id,
      },

      data: {
        deletedAt: new Date(),
        status: 'INACTIVE',
      },
    });
  }

  async findByUsername(
    username: string,
  ) {
    return this.prisma.user.findUnique({
      where: {
        username:
          username.trim().toLowerCase(),
      },

      include: {
        roles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
            region: true,
            district: true,
            branch: true,
          },
        },

        staffProfile: {
          include: {
            branch: {
              include: {
                district: {
                  include: {
                    region: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }
}