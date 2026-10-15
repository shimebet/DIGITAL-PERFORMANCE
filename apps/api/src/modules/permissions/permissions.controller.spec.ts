
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  PermissionsController,
} from './permissions.controller.js';

import {
  PermissionsService,
} from './permissions.service.js';

describe('PermissionsController', () => {
  let controller: PermissionsController;

  const permissionsServiceMock = {
    findAll: vi.fn(),
    findOne: vi.fn(),
    findByModule: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();

    controller = new PermissionsController(
      permissionsServiceMock as unknown as PermissionsService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return all permissions when module is not provided', async () => {
    const permissions = [
      {
        id: 'permission-1',
        module: 'users',
        action: 'read',
      },
      {
        id: 'permission-2',
        module: 'roles',
        action: 'create',
      },
    ];

    permissionsServiceMock.findAll.mockResolvedValue(
      permissions,
    );

    const result = await controller.findAll();

    expect(
      permissionsServiceMock.findAll,
    ).toHaveBeenCalledOnce();

    expect(
      permissionsServiceMock.findByModule,
    ).not.toHaveBeenCalled();

    expect(result).toEqual(permissions);
  });

  it('should filter permissions by module', async () => {
    const permissions = [
      {
        id: 'permission-1',
        module: 'users',
        action: 'read',
      },
    ];

    permissionsServiceMock.findByModule.mockResolvedValue(
      permissions,
    );

    const result = await controller.findAll('users');

    expect(
      permissionsServiceMock.findByModule,
    ).toHaveBeenCalledWith('users');

    expect(
      permissionsServiceMock.findAll,
    ).not.toHaveBeenCalled();

    expect(result).toEqual(permissions);
  });

  it('should return a permission by ID', async () => {
    const permission = {
      id: 'permission-1',
      module: 'users',
      action: 'read',
    };

    permissionsServiceMock.findOne.mockResolvedValue(
      permission,
    );

    const result = await controller.findOne(
      'permission-1',
    );

    expect(
      permissionsServiceMock.findOne,
    ).toHaveBeenCalledWith('permission-1');

    expect(result).toEqual(permission);
  });

  it('should propagate service errors', async () => {
    permissionsServiceMock.findOne.mockRejectedValue(
      new Error('Permission not found'),
    );

    await expect(
      controller.findOne('missing-permission'),
    ).rejects.toThrow('Permission not found');
  });
});
