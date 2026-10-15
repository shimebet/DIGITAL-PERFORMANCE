
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BranchesController } from './branches.controller.js';
import { BranchesService } from './branches.service.js';

describe('BranchesController', () => {
  let controller: BranchesController;

  const branchesServiceMock = {
    createScoped: vi.fn(),
    findAllScoped: vi.fn(),
    findOneScoped: vi.fn(),
    updateScoped: vi.fn(),
    removeScoped: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();

    controller = new BranchesController(
      branchesServiceMock as unknown as BranchesService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('creates a branch using the current user scope', async () => {
    const dto = {
      code: 'BR001',
      name: 'Test Branch',
      districtId: 'district-1',
    };

    const user = {} as Parameters<BranchesController['create']>[1];

    const expected = {
      id: 'branch-1',
      ...dto,
    };

    branchesServiceMock.createScoped.mockResolvedValue(expected);

    const result = await controller.create(dto, user);

    expect(branchesServiceMock.createScoped).toHaveBeenCalledWith(
      dto,
      user,
    );

    expect(result).toEqual(expected);
  });

  it('returns branches scoped to the current user', async () => {
    const user = {} as Parameters<BranchesController['findAll']>[1];

    branchesServiceMock.findAllScoped.mockResolvedValue([]);

    const result = await controller.findAll('district-1', user);

    expect(branchesServiceMock.findAllScoped).toHaveBeenCalledWith(
      user,
      'district-1',
    );

    expect(result).toEqual([]);
  });

  it('returns one branch within the current user scope', async () => {
    const user = {} as Parameters<BranchesController['findOne']>[1];

    const expected = {
      id: 'branch-1',
      name: 'Test Branch',
    };

    branchesServiceMock.findOneScoped.mockResolvedValue(expected);

    const result = await controller.findOne('branch-1', user);

    expect(branchesServiceMock.findOneScoped).toHaveBeenCalledWith(
      'branch-1',
      user,
    );

    expect(result).toEqual(expected);
  });

  it('updates a branch within the current user scope', async () => {
    const user = {} as Parameters<BranchesController['update']>[2];

    const dto = {
      name: 'Updated Branch',
    };

    const expected = {
      id: 'branch-1',
      ...dto,
    };

    branchesServiceMock.updateScoped.mockResolvedValue(expected);

    const result = await controller.update(
      'branch-1',
      dto,
      user,
    );

    expect(branchesServiceMock.updateScoped).toHaveBeenCalledWith(
      'branch-1',
      dto,
      user,
    );

    expect(result).toEqual(expected);
  });

  it('removes a branch within the current user scope', async () => {
    const user = {} as Parameters<BranchesController['remove']>[1];

    const expected = {
      id: 'branch-1',
      status: 'INACTIVE',
    };

    branchesServiceMock.removeScoped.mockResolvedValue(expected);

    const result = await controller.remove('branch-1', user);

    expect(branchesServiceMock.removeScoped).toHaveBeenCalledWith(
      'branch-1',
      user,
    );

    expect(result).toEqual(expected);
  });
});
