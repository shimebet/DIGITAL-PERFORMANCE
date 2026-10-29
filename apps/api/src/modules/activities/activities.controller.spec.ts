
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  BadRequestException,
} from '@nestjs/common';

import {
  ActivitiesController,
} from './activities.controller.js';

import {
  ActivitiesService,
} from './activities.service.js';

import {
  ActivitiesImportService,
} from './import/activities-import.service.js';

// ============================================================
// ACTIVITIES CONTROLLER UNIT TESTS
// ============================================================

describe('ActivitiesController', () => {
  let controller: ActivitiesController;

  // ----------------------------------------------------------
  // MOCK EXISTING ACTIVITIES SERVICE
  // ----------------------------------------------------------

  const activitiesServiceMock = {
    create: vi.fn(),
    findMine: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
  };

  // ----------------------------------------------------------
  // MOCK CSV IMPORT SERVICE
  // ----------------------------------------------------------

  const activitiesImportServiceMock = {
    preview: vi.fn(),
    confirm: vi.fn(),
  };

  // ----------------------------------------------------------
  // INITIALIZATION
  // ----------------------------------------------------------

  beforeEach(() => {
    vi.resetAllMocks();

    controller = new ActivitiesController(
      activitiesServiceMock as unknown as ActivitiesService,
      activitiesImportServiceMock as unknown as ActivitiesImportService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ============================================================
  // CREATE ACTIVITY
  // ============================================================

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

  // ============================================================
  // FIND MY ACTIVITIES
  // ============================================================

  it('should return activities belonging to the current user', async () => {
    const user =
      {} as Parameters<ActivitiesController['findMine']>[0];

    const expected = [
      { id: 'activity-1' },
      { id: 'activity-2' },
    ];

    activitiesServiceMock.findMine.mockResolvedValue(expected);

    const result = await controller.findMine(user);

    expect(
      activitiesServiceMock.findMine,
    ).toHaveBeenCalledWith(user);

    expect(result).toEqual(expected);
  });

  // ============================================================
  // FIND ONE ACTIVITY
  // ============================================================

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

  // ============================================================
  // UPDATE ACTIVITY
  // ============================================================

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

  // ============================================================
  // CSV IMPORT TEMPLATE
  // ============================================================

  it('should download a CSV template with the required headers', () => {
    const response = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };

    controller.downloadImportTemplate(
      response as unknown as Parameters<
        ActivitiesController['downloadImportTemplate']
      >[0],
    );

    expect(response.status).toHaveBeenCalledWith(200);

    expect(response.send).toHaveBeenCalledOnce();

    const csv = response.send.mock.calls[0][0] as string;

    expect(csv).toContain('activityDate');
    expect(csv).toContain('productCode');
    expect(csv).toContain('customerVisits');
    expect(csv).toContain('productActivations');
    expect(csv).toContain('failedActivations');
  });

  // ============================================================
  // CSV IMPORT PREVIEW
  // ============================================================

  it('should preview a valid CSV without saving activities', async () => {
    const file = {
      originalname: 'activities.csv',
      buffer: Buffer.from('activityDate,productCode\n'),
    } as Parameters<ActivitiesController['previewImport']>[0];

    const user =
      {} as Parameters<ActivitiesController['previewImport']>[1];

    const expected = {
      valid: true,
      totalRows: 3,
      totalActivities: 1,
      totalProductRecords: 3,
      errors: [],
      summary: {
        customerVisits: 25,
        phoneCalls: 15,
        customersContacted: 22,
        customersEducated: 20,
        activations: 10,
        reactivations: 2,
        transactions: 7,
      },
    };

    activitiesImportServiceMock.preview.mockResolvedValue(expected);

    const result = await controller.previewImport(file, user);

    expect(
      activitiesImportServiceMock.preview,
    ).toHaveBeenCalledWith(
      file.buffer,
      user,
    );

    expect(result).toEqual(expected);

    expect(
      activitiesImportServiceMock.confirm,
    ).not.toHaveBeenCalled();
  });

  it('should reject preview when no file is uploaded', () => {
    const user =
      {} as Parameters<ActivitiesController['previewImport']>[1];

    expect(() =>
      controller.previewImport(
        undefined as unknown as Parameters<
          ActivitiesController['previewImport']
        >[0],
        user,
      ),
    ).toThrow(BadRequestException);

    expect(
      activitiesImportServiceMock.preview,
    ).not.toHaveBeenCalled();
  });

  it('should reject preview for a non-CSV filename', () => {
    const file = {
      originalname: 'activities.txt',
      buffer: Buffer.from('invalid file'),
    } as Parameters<ActivitiesController['previewImport']>[0];

    const user =
      {} as Parameters<ActivitiesController['previewImport']>[1];

    expect(() =>
      controller.previewImport(file, user),
    ).toThrow(BadRequestException);

    expect(
      activitiesImportServiceMock.preview,
    ).not.toHaveBeenCalled();
  });

  // ============================================================
  // CSV IMPORT CONFIRM
  // ============================================================

  it('should confirm CSV import for the current user', async () => {
    const file = {
      originalname: 'activities.csv',
      buffer: Buffer.from('activityDate,productCode\n'),
    } as Parameters<ActivitiesController['confirmImport']>[0];

    const user =
      {} as Parameters<ActivitiesController['confirmImport']>[1];

    const expected = {
      success: true,
      importedActivities: 1,
      importedProductRecords: 3,
      message: 'CSV activities imported successfully',
    };

    activitiesImportServiceMock.confirm.mockResolvedValue(expected);

    const result = await controller.confirmImport(file, user);

    expect(
      activitiesImportServiceMock.confirm,
    ).toHaveBeenCalledWith(
      file.buffer,
      user,
    );

    expect(result).toEqual(expected);
  });

  it('should reject confirmation when no file is uploaded', () => {
    const user =
      {} as Parameters<ActivitiesController['confirmImport']>[1];

    expect(() =>
      controller.confirmImport(
        undefined as unknown as Parameters<
          ActivitiesController['confirmImport']
        >[0],
        user,
      ),
    ).toThrow(BadRequestException);

    expect(
      activitiesImportServiceMock.confirm,
    ).not.toHaveBeenCalled();
  });

  it('should reject confirmation for a non-CSV filename', () => {
    const file = {
      originalname: 'activities.xlsx',
      buffer: Buffer.from('invalid file'),
    } as Parameters<ActivitiesController['confirmImport']>[0];

    const user =
      {} as Parameters<ActivitiesController['confirmImport']>[1];

    expect(() =>
      controller.confirmImport(file, user),
    ).toThrow(BadRequestException);

    expect(
      activitiesImportServiceMock.confirm,
    ).not.toHaveBeenCalled();
  });
});
