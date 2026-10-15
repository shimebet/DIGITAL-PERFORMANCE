
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  RolesController,
} from './roles.controller.js';

import {
  RolesService,
} from './roles.service.js';

import type {
  CreateRoleDto,
} from './dto/create-role.dto.js';

import type {
  UpdateRoleDto,
} from './dto/update-role.dto.js';

describe('RolesController', () => {
  let controller: RolesController;

  const rolesServiceMock = {
    create: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();

    controller = new RolesController(
      rolesServiceMock as unknown as RolesService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create a role', async () => {
    const dto = {
      code: 'TEST_ROLE',
      name: 'Test Role',
      description: 'Testing role creation',
    } as CreateRoleDto;

    const expected = {
      id: 'role-1',
      ...dto,
    };

    rolesServiceMock.create.mockResolvedValue(expected);

    const result = await controller.create(dto);

    expect(
      rolesServiceMock.create,
    ).toHaveBeenCalledWith(dto);

    expect(result).toEqual(expected);
  });

  it('should return all roles', async () => {
    const roles = [
      {
        id: 'role-1',
        code: 'ADMIN',
        name: 'Administrator',
      },
      {
        id: 'role-2',
        code: 'MANAGER',
        name: 'Manager',
      },
    ];

    rolesServiceMock.findAll.mockResolvedValue(roles);

    const result = await controller.findAll();

    expect(
      rolesServiceMock.findAll,
    ).toHaveBeenCalledOnce();

    expect(result).toEqual(roles);
  });

  it('should return a role by ID', async () => {
    const role = {
      id: 'role-1',
      code: 'ADMIN',
      name: 'Administrator',
    };

    rolesServiceMock.findOne.mockResolvedValue(role);

    const result = await controller.findOne('role-1');

    expect(
      rolesServiceMock.findOne,
    ).toHaveBeenCalledWith('role-1');

    expect(result).toEqual(role);
  });

  it('should update a role', async () => {
    const dto = {
      name: 'Updated Role',
      description: 'Updated description',
    } as UpdateRoleDto;

    const expected = {
      id: 'role-1',
      code: 'TEST_ROLE',
      ...dto,
    };

    rolesServiceMock.update.mockResolvedValue(expected);

    const result = await controller.update(
      'role-1',
      dto,
    );

    expect(
      rolesServiceMock.update,
    ).toHaveBeenCalledWith('role-1', dto);

    expect(result).toEqual(expected);
  });

  it('should propagate service errors', async () => {
    rolesServiceMock.findOne.mockRejectedValue(
      new Error('Role not found'),
    );

    await expect(
      controller.findOne('missing-role'),
    ).rejects.toThrow('Role not found');
  });
});
