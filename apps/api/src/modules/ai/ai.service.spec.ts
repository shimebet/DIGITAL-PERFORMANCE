
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AiService } from './ai.service.js';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { PerformanceService } from '../performance/performance.service.js';
import { ScopeService } from '../auth/services/scope.service.js';
import { RulesAiProvider } from './providers/rules-ai.provider.js';

describe('AiService', () => {
  let service: AiService;

  const prismaMock = {
    aiInsight: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    aiRecommendation: {
      create: vi.fn(),
    },
    branch: {
      findUnique: vi.fn(),
    },
  };

  const performanceServiceMock = {
    summary: vi.fn(),
    dailyTrend: vi.fn(),
    productComparison: vi.fn(),
  };

  const scopeServiceMock = {
    isGlobal: vi.fn(),
    getRegionIds: vi.fn(),
    getDistrictIds: vi.fn(),
    getBranchIds: vi.fn(),
    assertRegionAccess: vi.fn(),
    assertDistrictAccess: vi.fn(),
    assertBranchAccess: vi.fn(),
  };

  const aiProviderMock = {};

  const user = {
    id: 'manager-1',
    roles: ['REGIONAL_MANAGER'],
  } as Parameters<AiService['findAll']>[0];

  const branch = {
    id: 'branch-1',
    code: 'BR001',
    name: 'Test Branch',
    districtId: 'district-1',
    district: {
      regionId: 'region-1',
      name: 'Test District',
      region: {
        id: 'region-1',
        name: 'Test Region',
      },
    },
  };

  const makePerformanceRow = (
    overrides: Record<string, number> = {},
  ) => ({
    branchId: 'branch-1',
    branchName: 'Test Branch',
    customerVisits: 0,
    customersContacted: 0,
    customersEducated: 0,
    activations: 0,
    reactivations: 0,
    transactions: 0,
    conversionRate: 0,
    target: 0,
    achievementRate: 0,
    ...overrides,
  });

  const mockBranchPerformance = (
    rows: ReturnType<typeof makePerformanceRow>[],
  ) => {
    vi.spyOn(
      service as any,
      'getAccessibleBranchPerformance',
    ).mockResolvedValue(rows);
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetAllMocks();

    scopeServiceMock.isGlobal.mockReturnValue(true);
    scopeServiceMock.getRegionIds.mockReturnValue([]);
    scopeServiceMock.getDistrictIds.mockReturnValue([]);
    scopeServiceMock.getBranchIds.mockReturnValue([]);

    prismaMock.branch.findUnique.mockResolvedValue(branch);
    prismaMock.aiInsight.findFirst.mockResolvedValue(null);

    prismaMock.aiInsight.create.mockImplementation(
      async ({ data }) => ({
        id: 'insight-1',
        ...data,
      }),
    );

    service = new AiService(
      prismaMock as unknown as PrismaService,
      performanceServiceMock as unknown as PerformanceService,
      scopeServiceMock as unknown as ScopeService,
      aiProviderMock as unknown as RulesAiProvider,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('generates a low conversion insight', async () => {
    mockBranchPerformance([
      makePerformanceRow({
        customersEducated: 20,
        activations: 4,
        conversionRate: 20,
      }),
    ]);

    const result = await service.generateInsights({}, user);

    expect(result.generated).toBe(1);

    expect(result.insights[0]).toEqual(
      expect.objectContaining({
        insightType: 'LOW_CONVERSION',
        branchId: 'branch-1',
      }),
    );

    expect(prismaMock.aiInsight.create).toHaveBeenCalledOnce();
  });

  it('generates an underperformance insight', async () => {
    mockBranchPerformance([
      makePerformanceRow({
        customerVisits: 30,
        activations: 3,
      }),
    ]);

    const result = await service.generateInsights({}, user);

    expect(result.insights).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          insightType: 'UNDERPERFORMANCE',
        }),
      ]),
    );
  });

  it('generates a target gap insight', async () => {
    mockBranchPerformance([
      makePerformanceRow({
        target: 100,
        activations: 50,
        achievementRate: 50,
      }),
    ]);

    const result = await service.generateInsights({}, user);

    expect(result.insights).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          insightType: 'TARGET_GAP',
        }),
      ]),
    );
  });

  it('generates an overperformance insight', async () => {
    mockBranchPerformance([
      makePerformanceRow({
        target: 100,
        activations: 120,
        achievementRate: 120,
      }),
    ]);

    const result = await service.generateInsights({}, user);

    expect(result.insights).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          insightType: 'OVERPERFORMANCE',
        }),
      ]),
    );
  });

  it('does not generate insights when no thresholds are met', async () => {
    mockBranchPerformance([
      makePerformanceRow({
        customerVisits: 5,
        customersEducated: 5,
        activations: 3,
        conversionRate: 60,
      }),
    ]);

    const result = await service.generateInsights({}, user);

    expect(result).toEqual({
      generated: 0,
      insights: [],
    });

    expect(prismaMock.aiInsight.create).not.toHaveBeenCalled();
  });

  it('updates an existing insight instead of creating a duplicate', async () => {
    mockBranchPerformance([
      makePerformanceRow({
        customersEducated: 20,
        activations: 4,
        conversionRate: 20,
      }),
    ]);

    prismaMock.aiInsight.findFirst.mockResolvedValue({
      id: 'existing-insight',
      recommendations: [
        { id: 'recommendation-1' },
      ],
    });

    prismaMock.aiInsight.update.mockResolvedValue({
      id: 'existing-insight',
      insightType: 'LOW_CONVERSION',
    });

    const result = await service.generateInsights({}, user);

    expect(prismaMock.aiInsight.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'existing-insight',
        },
      }),
    );

    expect(prismaMock.aiInsight.create).not.toHaveBeenCalled();
    expect(prismaMock.aiRecommendation.create).not.toHaveBeenCalled();

    expect(result.generated).toBe(1);
  });

  it('creates a recommendation when an existing insight has none', async () => {
    mockBranchPerformance([
      makePerformanceRow({
        customersEducated: 20,
        activations: 4,
        conversionRate: 20,
      }),
    ]);

    prismaMock.aiInsight.findFirst.mockResolvedValue({
      id: 'existing-insight',
      recommendations: [],
    });

    prismaMock.aiInsight.update.mockResolvedValue({
      id: 'existing-insight',
    });

    prismaMock.aiInsight.findUnique.mockResolvedValue({
      id: 'existing-insight',
      recommendations: [{ id: 'recommendation-1' }],
    });

    const result = await service.generateInsights({}, user);

    expect(prismaMock.aiRecommendation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          insightId: 'existing-insight',
          title: 'Suggested corrective action',
        }),
      }),
    );

    expect(result.generated).toBe(1);
    expect(prismaMock.aiInsight.create).not.toHaveBeenCalled();
  });

  it('rejects unauthorized region filters before querying insights', async () => {
    scopeServiceMock.assertRegionAccess.mockRejectedValue(
      new Error('Region access denied'),
    );

    await expect(
      service.findAll(user, { regionId: 'region-2' }),
    ).rejects.toThrow('Region access denied');

    expect(prismaMock.aiInsight.findMany).not.toHaveBeenCalled();
  });

  it('rejects unauthorized district filters', async () => {
    scopeServiceMock.assertDistrictAccess.mockRejectedValue(
      new Error('District access denied'),
    );

    await expect(
      service.findAll(user, { districtId: 'district-2' }),
    ).rejects.toThrow('District access denied');

    expect(prismaMock.aiInsight.findMany).not.toHaveBeenCalled();
  });

  it('rejects unauthorized branch filters', async () => {
    scopeServiceMock.assertBranchAccess.mockRejectedValue(
      new Error('Branch access denied'),
    );

    await expect(
      service.findAll(user, { branchId: 'branch-2' }),
    ).rejects.toThrow('Branch access denied');

    expect(prismaMock.aiInsight.findMany).not.toHaveBeenCalled();
  });

  it('queries insights without organizational restrictions for global users', async () => {
    prismaMock.aiInsight.findMany.mockResolvedValue([]);

    await service.findAll(user, {
      productId: 'product-1',
    });

    expect(prismaMock.aiInsight.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          productId: 'product-1',
        }),
        orderBy: {
          generatedAt: 'desc',
        },
      }),
    );
  });

  it('restricts non-global users to their assigned scope', async () => {
    scopeServiceMock.isGlobal.mockReturnValue(false);
    scopeServiceMock.getRegionIds.mockReturnValue(['region-1']);
    scopeServiceMock.getDistrictIds.mockReturnValue(['district-1']);
    scopeServiceMock.getBranchIds.mockReturnValue(['branch-1']);

    prismaMock.aiInsight.findMany.mockResolvedValue([]);

    await service.findAll(user, {});

    expect(prismaMock.aiInsight.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            {},
            {
              OR: [
                { userId: 'manager-1' },
                { branchId: { in: ['branch-1'] } },
                { districtId: { in: ['district-1'] } },
                { regionId: { in: ['region-1'] } },
              ],
            },
          ],
        },
      }),
    );
  });

  it('propagates database errors when retrieving insights', async () => {
    prismaMock.aiInsight.findMany.mockRejectedValue(
      new Error('Database unavailable'),
    );

    await expect(
      service.findAll(user, {}),
    ).rejects.toThrow('Database unavailable');
  });
});
