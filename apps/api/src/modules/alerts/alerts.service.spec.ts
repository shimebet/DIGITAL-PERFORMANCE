
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AlertsService } from './alerts.service.js';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { ScopeService } from '../auth/services/scope.service.js';

describe('AlertsService', () => {
  let service: AlertsService;

  const prismaMock = {
    alert: {
      findMany: vi.fn(),
    },
  };

  const scopeServiceMock = {
    assertRegionAccess: vi.fn(),
    assertDistrictAccess: vi.fn(),
    assertBranchAccess: vi.fn(),
    getRegionIds: vi.fn(),
    getDistrictIds: vi.fn(),
    getBranchIds: vi.fn(),
    isGlobal: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();

    scopeServiceMock.getRegionIds.mockReturnValue([]);
    scopeServiceMock.getDistrictIds.mockReturnValue([]);
    scopeServiceMock.getBranchIds.mockReturnValue([]);
    scopeServiceMock.isGlobal.mockReturnValue(true);

    service = new AlertsService(
      prismaMock as unknown as PrismaService,
      scopeServiceMock as unknown as ScopeService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('validates region access before querying alerts', async () => {
    const query = {
      regionId: 'region-1',
    } as Parameters<AlertsService['findAll']>[0];

    const user = {
      id: 'user-1',
    } as Parameters<AlertsService['findAll']>[1];

    const accessError = new Error('Region access denied');

    scopeServiceMock.assertRegionAccess.mockRejectedValue(accessError);

    await expect(
      service.findAll(query, user),
    ).rejects.toThrow('Region access denied');

    expect(scopeServiceMock.assertRegionAccess).toHaveBeenCalledWith(
      user,
      'region-1',
    );

    expect(prismaMock.alert.findMany).not.toHaveBeenCalled();
  });

  it('validates district access before querying alerts', async () => {
    const query = {
      districtId: 'district-1',
    } as Parameters<AlertsService['findAll']>[0];

    const user = {
      id: 'user-1',
    } as Parameters<AlertsService['findAll']>[1];

    scopeServiceMock.assertDistrictAccess.mockRejectedValue(
      new Error('District access denied'),
    );

    await expect(
      service.findAll(query, user),
    ).rejects.toThrow('District access denied');

    expect(scopeServiceMock.assertDistrictAccess).toHaveBeenCalledWith(
      user,
      'district-1',
    );

    expect(prismaMock.alert.findMany).not.toHaveBeenCalled();
  });

  it('validates branch access before querying alerts', async () => {
    const query = {
      branchId: 'branch-1',
    } as Parameters<AlertsService['findAll']>[0];

    const user = {
      id: 'user-1',
    } as Parameters<AlertsService['findAll']>[1];

    scopeServiceMock.assertBranchAccess.mockRejectedValue(
      new Error('Branch access denied'),
    );

    await expect(
      service.findAll(query, user),
    ).rejects.toThrow('Branch access denied');

    expect(scopeServiceMock.assertBranchAccess).toHaveBeenCalledWith(
      user,
      'branch-1',
    );

    expect(prismaMock.alert.findMany).not.toHaveBeenCalled();
  });

  it('validates all supplied organizational filters', async () => {
    const query = {
      regionId: 'region-1',
      districtId: 'district-1',
      branchId: 'branch-1',
    } as Parameters<AlertsService['findAll']>[0];

    const user = {
      id: 'user-1',
    } as Parameters<AlertsService['findAll']>[1];

    prismaMock.alert.findMany.mockResolvedValue([]);

    await service.findAll(query, user);

    expect(scopeServiceMock.assertRegionAccess).toHaveBeenCalledWith(
      user,
      'region-1',
    );

    expect(scopeServiceMock.assertDistrictAccess).toHaveBeenCalledWith(
      user,
      'district-1',
    );

    expect(scopeServiceMock.assertBranchAccess).toHaveBeenCalledWith(
      user,
      'branch-1',
    );

    expect(prismaMock.alert.findMany).toHaveBeenCalledOnce();
  });

  it('applies status, severity, and product filters', async () => {
    const query = {
      status: 'OPEN',
      severity: 'HIGH',
      productId: 'product-1',
    } as Parameters<AlertsService['findAll']>[0];

    const user = {
      id: 'user-1',
    } as Parameters<AlertsService['findAll']>[1];

    prismaMock.alert.findMany.mockResolvedValue([]);

    await service.findAll(query, user);

    expect(prismaMock.alert.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'OPEN',
          severity: 'HIGH',
          productId: 'product-1',
        }),
      }),
    );
  });

  it('filters alerts by detection date range', async () => {
    const query = {
      startDate: '2026-10-01',
      endDate: '2026-10-13',
    } as Parameters<AlertsService['findAll']>[0];

    const user = {
      id: 'user-1',
    } as Parameters<AlertsService['findAll']>[1];

    prismaMock.alert.findMany.mockResolvedValue([]);

    await service.findAll(query, user);

    expect(prismaMock.alert.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          detectedAt: {
            gte: new Date('2026-10-01T00:00:00.000'),
            lte: new Date('2026-10-13T23:59:59.999'),
          },
        }),
      }),
    );
  });
});
