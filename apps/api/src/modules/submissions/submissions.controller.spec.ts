
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  SubmissionsController,
} from './submissions.controller.js';

import {
  SubmissionsService,
} from './submissions.service.js';

describe('SubmissionsController', () => {
  let controller: SubmissionsController;

  const submissionsServiceMock = {
    createDraft: vi.fn(),
    mine: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    submit: vi.fn(),
    review: vi.fn(),
    approve: vi.fn(),
    returnForCorrection: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();

    controller = new SubmissionsController(
      submissionsServiceMock as unknown as SubmissionsService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('creates a daily draft for the current user', async () => {
    const dto = {
      submissionDate: '2026-10-13',
      remarks: 'Daily activity report',
    };

    const user =
      {} as Parameters<SubmissionsController['createDraft']>[1];

    const expected = {
      id: 'submission-1',
      status: 'DRAFT',
    };

    submissionsServiceMock.createDraft.mockResolvedValue(expected);

    const result = await controller.createDraft(dto, user);

    expect(submissionsServiceMock.createDraft).toHaveBeenCalledWith(
      dto.submissionDate,
      dto.remarks,
      user,
    );

    expect(result).toEqual(expected);
  });

  it('returns the current user submissions', async () => {
    const user =
      {} as Parameters<SubmissionsController['mine']>[0];

    const expected = [
      {
        id: 'submission-1',
        status: 'DRAFT',
      },
    ];

    submissionsServiceMock.mine.mockResolvedValue(expected);

    const result = await controller.mine(user);

    expect(submissionsServiceMock.mine).toHaveBeenCalledWith(user);

    expect(result).toEqual(expected);
  });

  it('returns submissions using query and user scope', async () => {
    const query =
      {} as Parameters<SubmissionsController['findAll']>[0];

    const user =
      {} as Parameters<SubmissionsController['findAll']>[1];

    const expected = [
      {
        id: 'submission-1',
      },
    ];

    submissionsServiceMock.findAll.mockResolvedValue(expected);

    const result = await controller.findAll(query, user);

    expect(submissionsServiceMock.findAll).toHaveBeenCalledWith(
      query,
      user,
    );

    expect(result).toEqual(expected);
  });

  it('returns a single submission', async () => {
    const user =
      {} as Parameters<SubmissionsController['findOne']>[1];

    const expected = {
      id: 'submission-1',
      status: 'SUBMITTED',
    };

    submissionsServiceMock.findOne.mockResolvedValue(expected);

    const result = await controller.findOne(
      'submission-1',
      user,
    );

    expect(submissionsServiceMock.findOne).toHaveBeenCalledWith(
      'submission-1',
      user,
    );

    expect(result).toEqual(expected);
  });

  it('submits a daily submission', async () => {
    const user =
      {} as Parameters<SubmissionsController['submit']>[1];

    const expected = {
      id: 'submission-1',
      status: 'SUBMITTED',
    };

    submissionsServiceMock.submit.mockResolvedValue(expected);

    const result = await controller.submit(
      'submission-1',
      user,
    );

    expect(submissionsServiceMock.submit).toHaveBeenCalledWith(
      'submission-1',
      user,
    );

    expect(result).toEqual(expected);
  });

  it('reviews a submitted record', async () => {
    const user =
      {} as Parameters<SubmissionsController['review']>[1];

    const expected = {
      id: 'submission-1',
      status: 'REVIEWED',
    };

    submissionsServiceMock.review.mockResolvedValue(expected);

    const result = await controller.review(
      'submission-1',
      user,
    );

    expect(submissionsServiceMock.review).toHaveBeenCalledWith(
      'submission-1',
      user,
    );

    expect(result).toEqual(expected);
  });

  it('approves a reviewed submission', async () => {
    const user =
      {} as Parameters<SubmissionsController['approve']>[1];

    const expected = {
      id: 'submission-1',
      status: 'APPROVED',
    };

    submissionsServiceMock.approve.mockResolvedValue(expected);

    const result = await controller.approve(
      'submission-1',
      user,
    );

    expect(submissionsServiceMock.approve).toHaveBeenCalledWith(
      'submission-1',
      user,
    );

    expect(result).toEqual(expected);
  });

  it('returns a submission for correction with a reason', async () => {
    const dto = {
      reason: 'Please correct the activity figures',
    };

    const user =
      {} as Parameters<
        SubmissionsController['returnForCorrection']
      >[2];

    const expected = {
      id: 'submission-1',
      status: 'RETURNED_FOR_CORRECTION',
    };

    submissionsServiceMock.returnForCorrection.mockResolvedValue(
      expected,
    );

    const result = await controller.returnForCorrection(
      'submission-1',
      dto,
      user,
    );

    expect(
      submissionsServiceMock.returnForCorrection,
    ).toHaveBeenCalledWith(
      'submission-1',
      dto.reason,
      user,
    );

    expect(result).toEqual(expected);
  });
});
