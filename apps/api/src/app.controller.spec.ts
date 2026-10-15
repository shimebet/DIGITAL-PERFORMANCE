
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let controller: AppController;

  const appServiceMock = {
    getHealth: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();

    controller = new AppController(
      appServiceMock as unknown as AppService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('returns the health response from AppService', async () => {
    const expected = {
      status: 'ok',
    };

    appServiceMock.getHealth.mockResolvedValue(expected);

    const result = await controller.getHealth();

    expect(appServiceMock.getHealth).toHaveBeenCalledOnce();
    expect(result).toEqual(expected);
  });

  it('propagates health-check errors', async () => {
    appServiceMock.getHealth.mockRejectedValue(
      new Error('Health check failed'),
    );

    await expect(
      controller.getHealth(),
    ).rejects.toThrow('Health check failed');
  });
});
