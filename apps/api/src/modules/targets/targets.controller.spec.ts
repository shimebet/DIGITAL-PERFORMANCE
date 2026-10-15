
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TargetsController } from './targets.controller.js';
import { TargetsService } from './targets.service.js';

describe('TargetsController', () => {
  let controller: TargetsController;

  const targetsServiceMock = {
    create: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    assign: vi.fn(),
    findAssignments: vi.fn(),
    removeAssignment: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();

    controller = new TargetsController(
      targetsServiceMock as unknown as TargetsService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('creates a target using the current user', async () => {
    const dto = {} as Parameters<TargetsController['create']>[0];
    const user = {} as Parameters<TargetsController['create']>[1];

    const expected = { id: 'target-1' };

    targetsServiceMock.create.mockResolvedValue(expected);

    const result = await controller.create(dto, user);

    expect(targetsServiceMock.create).toHaveBeenCalledWith(
      dto,
      user,
    );
    expect(result).toEqual(expected);
  });

  it('returns targets visible to the current user', async () => {
    const user = {} as Parameters<TargetsController['findAll']>[0];
    const expected = [{ id: 'target-1' }];

    targetsServiceMock.findAll.mockResolvedValue(expected);

    const result = await controller.findAll(user);

    expect(targetsServiceMock.findAll).toHaveBeenCalledWith(user);
    expect(result).toEqual(expected);
  });

  it('returns a target by ID', async () => {
    const expected = { id: 'target-1' };

    targetsServiceMock.findOne.mockResolvedValue(expected);

    const result = await controller.findOne('target-1');

    expect(targetsServiceMock.findOne).toHaveBeenCalledWith(
      'target-1',
    );
    expect(result).toEqual(expected);
  });

  it('updates a target', async () => {
    const dto = {} as Parameters<TargetsController['update']>[1];
    const expected = { id: 'target-1', updated: true };

    targetsServiceMock.update.mockResolvedValue(expected);

    const result = await controller.update('target-1', dto);

    expect(targetsServiceMock.update).toHaveBeenCalledWith(
      'target-1',
      dto,
    );
    expect(result).toEqual(expected);
  });

  it('removes a target', async () => {
    const expected = { id: 'target-1', deleted: true };

    targetsServiceMock.remove.mockResolvedValue(expected);

    const result = await controller.remove('target-1');

    expect(targetsServiceMock.remove).toHaveBeenCalledWith(
      'target-1',
    );
    expect(result).toEqual(expected);
  });

  it('assigns a target using the current user', async () => {
    const dto = {} as Parameters<TargetsController['assign']>[0];
    const user = {} as Parameters<TargetsController['assign']>[1];

    const expected = { id: 'assignment-1' };

    targetsServiceMock.assign.mockResolvedValue(expected);

    const result = await controller.assign(dto, user);

    expect(targetsServiceMock.assign).toHaveBeenCalledWith(
      dto,
      user,
    );
    expect(result).toEqual(expected);
  });

  it('returns target assignments for the current user', async () => {
    const user =
      {} as Parameters<TargetsController['findAssignments']>[1];

    const expected = [{ id: 'assignment-1' }];

    targetsServiceMock.findAssignments.mockResolvedValue(expected);

    const result = await controller.findAssignments(
      'target-1',
      user,
    );

    expect(
      targetsServiceMock.findAssignments,
    ).toHaveBeenCalledWith('target-1', user);

    expect(result).toEqual(expected);
  });

  it('removes a target assignment using the current user', async () => {
    const user =
      {} as Parameters<TargetsController['removeAssignment']>[1];

    const expected = { id: 'assignment-1', deleted: true };

    targetsServiceMock.removeAssignment.mockResolvedValue(expected);

    const result = await controller.removeAssignment(
      'assignment-1',
      user,
    );

    expect(
      targetsServiceMock.removeAssignment,
    ).toHaveBeenCalledWith('assignment-1', user);

    expect(result).toEqual(expected);
  });
});
