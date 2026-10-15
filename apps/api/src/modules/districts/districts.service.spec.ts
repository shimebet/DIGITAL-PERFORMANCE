
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DistrictsService } from './districts.service.js';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { ScopeService } from '../auth/services/scope.service.js';

describe('DistrictsService', () => {
  let service: DistrictsService;

  const prismaMock = {
    region: {
      findFirst: vi.fn(),
    },
    district: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    branch: {
      count: vi.fn(),
    },
  };

  const scopeServiceMock = {};

  beforeEach(() => {
    vi.resetAllMocks();

    service = new DistrictsService(
      prismaMock as unknown as PrismaService,
      scopeServiceMock as ScopeService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects creating a district when the region does not exist', async () => {
    prismaMock.region.findFirst.mockResolvedValue(null);

    await expect(
      service.create({
        code: 'D001',
        name: 'District One',
        regionId: 'missing-region',
      }),
    ).rejects.toThrow('Region not found');

    expect(prismaMock.district.create).not.toHaveBeenCalled();
  });
});
