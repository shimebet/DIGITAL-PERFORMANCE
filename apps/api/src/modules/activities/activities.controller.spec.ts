
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  ActivitiesController,
} from './activities.controller.js';

import {
  ActivitiesService,
} from './activities.service.js';

describe('ActivitiesController', () => {
  let controller: ActivitiesController;

  const activitiesServiceMock = {
    create: vi.fn(),
    findMine: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();

    controller = new ActivitiesController(
      activitiesServiceMock as unknown as ActivitiesService,
    );
  });

  // --------------------------------------------------
  // INITIALIZATION
  // --------------------------------------------------

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // --------------------------------------------------
  // CREATE ACTIVITY
  // --------------------------------------------------

  it('should create an activity for the current user', async () => {
    const dto =
      {} as Parameters<ActivitiesController['create']>[0];

    const user =
      {} as Parameters<ActivitiesController['create']>[1];

    const expected = {
      id: 'activity-1',
      status: 'CREATED',
    };

    activitiesServiceMock.create.mockResolvedValue(expected);

    const result = await controller.create(dto, user);

    expect(
      activitiesServiceMock.create,
    ).toHaveBeenCalledWith(dto, user);

    expect(result).toEqual(expected);
  });

  // --------------------------------------------------
  // FIND MY ACTIVITIES
  // --------------------------------------------------

  it('should return activities belonging to the current user', async () => {
    const user =
      {} as Parameters<ActivitiesController['findMine']>[0];

    const expected = [
      {
        id: 'activity-1',
      },
      {
        id: 'activity-2',
      },
    ];

    activitiesServiceMock.findMine.mockResolvedValue(expected);

    const result = await controller.findMine(user);

    expect(
      activitiesServiceMock.findMine,
    ).toHaveBeenCalledWith(user);

    expect(result).toEqual(expected);
  });

  // --------------------------------------------------
  // FIND ONE ACTIVITY
  // --------------------------------------------------

  it('should return one activity by ID for the current user', async () => {
    const user =
      {} as Parameters<ActivitiesController['findOne']>[1];

    const expected = {
      id: 'activity-1',
    };

    activitiesServiceMock.findOne.mockResolvedValue(expected);

    const result = await controller.findOne(
      'activity-1',
      user,
    );

    expect(
      activitiesServiceMock.findOne,
    ).toHaveBeenCalledWith(
      'activity-1',
      user,
    );

    expect(result).toEqual(expected);
  });

  // --------------------------------------------------
  // UPDATE ACTIVITY
  // --------------------------------------------------

  it('should update an activity for the current user', async () => {
    const dto =
      {} as Parameters<ActivitiesController['update']>[1];

    const user =
      {} as Parameters<ActivitiesController['update']>[2];

    const expected = {
      id: 'activity-1',
      updated: true,
    };

    activitiesServiceMock.update.mockResolvedValue(expected);

    const result = await controller.update(
      'activity-1',
      dto,
      user,
    );

    expect(
      activitiesServiceMock.update,
    ).toHaveBeenCalledWith(
      'activity-1',
      dto,
      user,
    );

    expect(result).toEqual(expected);
  });
});
