
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';

describe('AiController', () => {
  let controller: AiController;

  const aiServiceMock = {
    generateInsights: vi.fn(),
    findAll: vi.fn(),
    managementSummary: vi.fn(),
    managementQuery: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();

    controller = new AiController(
      aiServiceMock as unknown as AiService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('generates insights for the current user', async () => {
    const query =
      {} as Parameters<AiController['generate']>[0];

    const user =
      {} as Parameters<AiController['generate']>[1];

    const expected = {
      insights: [
        {
          insightType: 'LOW_CONVERSION',
          title: 'Low activation conversion',
        },
      ],
    };

    aiServiceMock.generateInsights.mockResolvedValue(expected);

    const result = await controller.generate(query, user);

    expect(aiServiceMock.generateInsights).toHaveBeenCalledWith(
      query,
      user,
    );

    expect(result).toEqual(expected);
  });

  it('returns stored insights', async () => {
    const query =
      {} as Parameters<AiController['insights']>[0];

    const user =
      {} as Parameters<AiController['insights']>[1];

    const expected = [
      {
        id: 'insight-1',
        insightType: 'TREND',
      },
    ];

    aiServiceMock.findAll.mockResolvedValue(expected);

    const result = await controller.insights(query, user);

    expect(aiServiceMock.findAll).toHaveBeenCalledWith(
      user,
      query,
    );

    expect(result).toEqual(expected);
  });

  it('returns management summary', async () => {
    const query =
      {} as Parameters<AiController['summary']>[0];

    const user =
      {} as Parameters<AiController['summary']>[1];

    const expected = {
      totalInsights: 12,
    };

    aiServiceMock.managementSummary.mockResolvedValue(expected);

    const result = await controller.summary(query, user);

    expect(aiServiceMock.managementSummary).toHaveBeenCalledWith(
      query,
      user,
    );

    expect(result).toEqual(expected);
  });

  it('processes a management analytics query', async () => {
    const dto =
      {} as Parameters<AiController['managementQuery']>[0];

    const user =
      {} as Parameters<AiController['managementQuery']>[1];

    const expected = {
      answer: 'Performance analytics result',
    };

    aiServiceMock.managementQuery.mockResolvedValue(expected);

    const result = await controller.managementQuery(dto, user);

    expect(aiServiceMock.managementQuery).toHaveBeenCalledWith(
      dto,
      user,
    );

    expect(result).toEqual(expected);
  });

  it('propagates errors from insight generation', async () => {
    const query =
      {} as Parameters<AiController['generate']>[0];

    const user =
      {} as Parameters<AiController['generate']>[1];

    aiServiceMock.generateInsights.mockRejectedValue(
      new Error('Insight generation failed'),
    );

    await expect(
      controller.generate(query, user),
    ).rejects.toThrow('Insight generation failed');
  });
});
