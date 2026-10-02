import { Test, TestingModule } from '@nestjs/testing';
import { PerformanceController } from './performance.controller.js';

describe('PerformanceController', () => {
  let controller: PerformanceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PerformanceController],
    }).compile();

    controller = module.get<PerformanceController>(PerformanceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
