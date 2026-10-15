
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RegionsController } from './regions.controller.js';
import { RegionsService } from './regions.service.js';

describe('RegionsController', () => {
  let controller: RegionsController;

  const regionsServiceMock = {
    create: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();

    controller = new RegionsController(
      regionsServiceMock as unknown as RegionsService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
