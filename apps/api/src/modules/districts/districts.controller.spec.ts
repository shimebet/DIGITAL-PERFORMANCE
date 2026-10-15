
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DistrictsController } from './districts.controller.js';
import { DistrictsService } from './districts.service.js';

describe('DistrictsController', () => {
  let controller: DistrictsController;

  const districtsServiceMock = {
    createScoped: vi.fn(),
    findAllScoped: vi.fn(),
    findOneScoped: vi.fn(),
    updateScoped: vi.fn(),
    removeScoped: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();

    controller = new DistrictsController(
      districtsServiceMock as unknown as DistrictsService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('creates a district using the current user scope', async () => {
    const dto = {
      code: 'D001',
      name: 'District One',
      regionId: 'region-1',
    };

    const user = {} as Parameters<DistrictsController['create']>[1];

    const expected = { id: 'district-1', ...dto };

    districtsServiceMock.createScoped.mockResolvedValue(expected);

    const result = await controller.create(dto, user);

    expect(districtsServiceMock.createScoped).toHaveBeenCalledWith(
      dto,
      user,
    );

    expect(result).toEqual(expected);
  });

  it('returns districts scoped to the current user', async () => {
    const user = {} as Parameters<DistrictsController['findAll']>[1];

    districtsServiceMock.findAllScoped.mockResolvedValue([]);

    const result = await controller.findAll('region-1', user);

    expect(districtsServiceMock.findAllScoped).toHaveBeenCalledWith(
      user,
      'region-1',
    );

    expect(result).toEqual([]);
  });

  it('returns one district within the current user scope', async () => {
    const user = {} as Parameters<DistrictsController['findOne']>[1];

    const expected = {
      id: 'district-1',
      name: 'District One',
    };

    districtsServiceMock.findOneScoped.mockResolvedValue(expected);

    const result = await controller.findOne('district-1', user);

    expect(districtsServiceMock.findOneScoped).toHaveBeenCalledWith(
      'district-1',
      user,
    );

    expect(result).toEqual(expected);
  });

  it('updates a district within the current user scope', async () => {
    const user = {} as Parameters<DistrictsController['update']>[2];

    const dto = { name: 'Updated District' };

    districtsServiceMock.updateScoped.mockResolvedValue({
      id: 'district-1',
      ...dto,
    });

    await controller.update('district-1', dto, user);

    expect(districtsServiceMock.updateScoped).toHaveBeenCalledWith(
      'district-1',
      dto,
      user,
    );
  });

  it('removes a district within the current user scope', async () => {
    const user = {} as Parameters<DistrictsController['remove']>[1];

    districtsServiceMock.removeScoped.mockResolvedValue({
      id: 'district-1',
      status: 'INACTIVE',
    });

    await controller.remove('district-1', user);

    expect(districtsServiceMock.removeScoped).toHaveBeenCalledWith(
      'district-1',
      user,
    );
  });
});
