
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PerformanceController } from './performance.controller.js';
import { PerformanceService } from './performance.service.js';

describe('PerformanceController', () => {
  let controller: PerformanceController;

  const performanceServiceMock = {
    summary: vi.fn(),
    dailyTrend: vi.fn(),
    productComparison: vi.fn(),
    branchRanking: vi.fn(),
    staffRanking: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();

    controller = new PerformanceController(
      performanceServiceMock as unknown as PerformanceService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('returns the performance summary', async () => {
    const query = {} as Parameters<PerformanceController['summary']>[0];
    const user = {} as Parameters<PerformanceController['summary']>[1];
    const expected = { totalActivations: 100 };

    performanceServiceMock.summary.mockResolvedValue(expected);

    const result = await controller.summary(query, user);

    expect(performanceServiceMock.summary).toHaveBeenCalledWith(
      query,
      user,
    );
    expect(result).toEqual(expected);
  });

  it('returns the daily performance trend', async () => {
    const query = {} as Parameters<PerformanceController['dailyTrend']>[0];
    const user = {} as Parameters<PerformanceController['dailyTrend']>[1];
    const expected = [{ date: '2026-10-13', activations: 20 }];

    performanceServiceMock.dailyTrend.mockResolvedValue(expected);

    const result = await controller.dailyTrend(query, user);

    expect(performanceServiceMock.dailyTrend).toHaveBeenCalledWith(
      query,
      user,
    );
    expect(result).toEqual(expected);
  });

  it('returns product performance comparison', async () => {
    const query =
      {} as Parameters<PerformanceController['productComparison']>[0];
    const user =
      {} as Parameters<PerformanceController['productComparison']>[1];

    const expected = [{ productId: 'product-1', activations: 50 }];

    performanceServiceMock.productComparison.mockResolvedValue(expected);

    const result = await controller.productComparison(query, user);

    expect(
      performanceServiceMock.productComparison,
    ).toHaveBeenCalledWith(query, user);

    expect(result).toEqual(expected);
  });

  it('returns branch performance rankings', async () => {
    const query =
      {} as Parameters<PerformanceController['branchRanking']>[0];
    const user =
      {} as Parameters<PerformanceController['branchRanking']>[1];

    const expected = [{ branchId: 'branch-1', achievementRate: 90 }];

    performanceServiceMock.branchRanking.mockResolvedValue(expected);

    const result = await controller.branchRanking(query, user);

    expect(performanceServiceMock.branchRanking).toHaveBeenCalledWith(
      query,
      user,
    );
    expect(result).toEqual(expected);
  });

  it('returns staff performance rankings', async () => {
    const query =
      {} as Parameters<PerformanceController['staffRanking']>[0];
    const user =
      {} as Parameters<PerformanceController['staffRanking']>[1];

    const expected = [{ staffId: 'staff-1', achievementRate: 95 }];

    performanceServiceMock.staffRanking.mockResolvedValue(expected);

    const result = await controller.staffRanking(query, user);

    expect(performanceServiceMock.staffRanking).toHaveBeenCalledWith(
      query,
      user,
    );
    expect(result).toEqual(expected);
  });
});
