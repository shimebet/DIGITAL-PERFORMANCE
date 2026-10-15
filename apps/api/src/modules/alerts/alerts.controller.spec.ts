
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AlertsController } from './alerts.controller.js';
import { AlertsService } from './alerts.service.js';
import { AlertDetectionService } from './alert-detection.service.js';

describe('AlertsController', () => {
  let controller: AlertsController;

  const alertsServiceMock = {
    findAll: vi.fn(),
    findOne: vi.fn(),
    acknowledge: vi.fn(),
    resolve: vi.fn(),
  };

  const detectionServiceMock = {
    runAll: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();

    controller = new AlertsController(
      alertsServiceMock as unknown as AlertsService,
      detectionServiceMock as unknown as AlertDetectionService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('returns alerts within the current user scope', async () => {
    const query = {} as Parameters<AlertsController['findAll']>[0];
    const user = {} as Parameters<AlertsController['findAll']>[1];

    const expected = [{ id: 'alert-1' }];

    alertsServiceMock.findAll.mockResolvedValue(expected);

    const result = await controller.findAll(query, user);

    expect(alertsServiceMock.findAll).toHaveBeenCalledWith(
      query,
      user,
    );

    expect(result).toEqual(expected);
  });

  it('runs alert detection', async () => {
    const expected = { processed: 10 };

    detectionServiceMock.runAll.mockResolvedValue(expected);

    const result = await controller.detect();

    expect(detectionServiceMock.runAll).toHaveBeenCalledOnce();
    expect(result).toEqual(expected);
  });

  it('returns an alert by ID', async () => {
    const user = {} as Parameters<AlertsController['findOne']>[1];
    const expected = { id: 'alert-1' };

    alertsServiceMock.findOne.mockResolvedValue(expected);

    const result = await controller.findOne('alert-1', user);

    expect(alertsServiceMock.findOne).toHaveBeenCalledWith(
      'alert-1',
      user,
    );

    expect(result).toEqual(expected);
  });

  it('acknowledges an alert', async () => {
    const user = {} as Parameters<AlertsController['acknowledge']>[1];

    const expected = {
      id: 'alert-1',
      status: 'ACKNOWLEDGED',
    };

    alertsServiceMock.acknowledge.mockResolvedValue(expected);

    const result = await controller.acknowledge('alert-1', user);

    expect(alertsServiceMock.acknowledge).toHaveBeenCalledWith(
      'alert-1',
      user,
    );

    expect(result).toEqual(expected);
  });

  it('resolves an alert', async () => {
    const user = {} as Parameters<AlertsController['resolve']>[1];

    const expected = {
      id: 'alert-1',
      status: 'RESOLVED',
    };

    alertsServiceMock.resolve.mockResolvedValue(expected);

    const result = await controller.resolve('alert-1', user);

    expect(alertsServiceMock.resolve).toHaveBeenCalledWith(
      'alert-1',
      user,
    );

    expect(result).toEqual(expected);
  });
});
