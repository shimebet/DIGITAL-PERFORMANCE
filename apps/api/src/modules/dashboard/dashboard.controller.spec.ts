
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';

describe('DashboardController', () => {
  let controller: DashboardController;

  const dashboardServiceMock = {
    overview: vi.fn(),
    branchRanking: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();

    controller = new DashboardController(
      dashboardServiceMock as unknown as DashboardService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('returns dashboard overview for the current user', async () => {
    const query =
      {} as Parameters<DashboardController['overview']>[0];

    const user =
      {} as Parameters<DashboardController['overview']>[1];

    const expected = {
      performance: { activations: 100 },
      submissions: { total: 20 },
      followUps: { pending: 5 },
    };

    dashboardServiceMock.overview.mockResolvedValue(expected);

    const result = await controller.overview(query, user);

    expect(dashboardServiceMock.overview).toHaveBeenCalledWith(
      query,
      user,
    );

    expect(result).toEqual(expected);
  });

  it('returns branch rankings for the current user', async () => {
    const query =
      {} as Parameters<DashboardController['branchRanking']>[0];

    const user =
      {} as Parameters<DashboardController['branchRanking']>[1];

    const expected = [
      {
        branchId: 'branch-1',
        achievementRate: 95,
      },
    ];

    dashboardServiceMock.branchRanking.mockResolvedValue(expected);

    const result = await controller.branchRanking(query, user);

    expect(
      dashboardServiceMock.branchRanking,
    ).toHaveBeenCalledWith(query, user);

    expect(result).toEqual(expected);
  });
});
