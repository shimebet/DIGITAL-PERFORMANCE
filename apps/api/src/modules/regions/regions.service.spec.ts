
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';

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

  beforeEach(async () => {
    vi.resetAllMocks();

    const module: TestingModule =
      await Test.createTestingModule({
        controllers: [RegionsController],
        providers: [
          {
            provide: RegionsService,
            useValue: regionsServiceMock,
          },
        ],
      }).compile();

    controller = module.get<RegionsController>(
      RegionsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
