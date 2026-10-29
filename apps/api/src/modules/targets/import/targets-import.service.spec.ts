
import {
    BadRequestException,
} from '@nestjs/common';

import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import type {
    AuthenticatedUser,
} from '../../auth/interfaces/authenticated-user.interface.js';

import {
    TargetsImportService,
} from './targets-import.service.js';

import type {
    TargetsService,
} from '../targets.service.js';

describe('TargetsImportService', () => {
    const targetId =
        '11111111-1111-4111-8111-111111111111';

    const parentAssignmentId =
        '22222222-2222-4222-8222-222222222222';

    const regionId =
        '33333333-3333-4333-8333-333333333333';

    const headers = [
        'targetId',
        'scopeType',
        'parentAssignmentId',
        'regionId',
        'districtId',
        'branchId',
        'userId',
        'productId',
        'targetValue',
    ].join(',');

    const globalRow = [
        targetId,
        'GLOBAL',
        '',
        '',
        '',
        '',
        '',
        '',
        '1000',
    ].join(',');

    const regionRow = [
        targetId,
        'REGION',
        parentAssignmentId,
        regionId,
        '',
        '',
        '',
        '',
        '250.50',
    ].join(',');

    const currentUser = {
        id: '44444444-4444-4444-8444-444444444444',
    } as AuthenticatedUser;
    let assignBatch: ReturnType<typeof vi.fn>;
    let validateBatchPreview: ReturnType<typeof vi.fn>;
    let service: TargetsImportService;

    function csv(...rows: string[]): Buffer {
        return Buffer.from(
            [headers, ...rows].join('\n'),
            'utf8',
        );
    }

    beforeEach(() => {
        assignBatch = vi.fn().mockResolvedValue({
            importedAssignments: 1,
        });

        validateBatchPreview = vi.fn().mockResolvedValue(
            undefined,
        );

        const targetsService = {
            assignBatch,
            validateBatchPreview,
        } as unknown as TargetsService;

        service = new TargetsImportService(
            targetsService,
        );
    });

    // ========================================================================
    // PREVIEW
    // ========================================================================

    it('previews a valid GLOBAL assignment', async () => {
        const result = await service.preview(
            csv(globalRow),
            currentUser,
        );

        expect(result.valid).toBe(true);
        expect(result.totalRows).toBe(1);
        expect(result.validRows).toBe(1);
        expect(result.errors).toEqual([]);

        expect(result.summary.global).toBe(1);
        expect(result.summary.totalTargetValue).toBe(1000);

        expect(assignBatch).not.toHaveBeenCalled();
    });

    it('summarizes multiple valid scope levels', async () => {
        const result = await service.preview(
            csv(globalRow, regionRow),
            currentUser,
        );

        expect(result.valid).toBe(true);
        expect(result.totalRows).toBe(2);
        expect(result.validRows).toBe(2);

        expect(result.summary.global).toBe(1);
        expect(result.summary.region).toBe(1);
        expect(result.summary.totalTargetValue).toBe(1250.5);
    });

    it('reports invalid CSV rows', async () => {
        const invalidRow = [
            'invalid-uuid',
            'GLOBAL',
            '',
            '',
            '',
            '',
            '',
            '',
            '100',
        ].join(',');

        const result = await service.preview(
            csv(invalidRow),
            currentUser,
        );

        expect(result.valid).toBe(false);
        expect(result.totalRows).toBe(1);
        expect(result.validRows).toBe(0);
        expect(result.errors.length).toBeGreaterThan(0);

        expect(assignBatch).not.toHaveBeenCalled();
    });

    it('rejects invalid CSV headers', async () => {
        await expect(
            service.preview(
                Buffer.from(
                    'wrong,headers\nvalue1,value2',
                ),
                currentUser,
            ),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    // ========================================================================
    // CONFIRM
    // ========================================================================


it('confirms a valid CSV import', async () => {
  const result = await service.confirm(
    csv(globalRow),
    currentUser,
  );

  expect(assignBatch).toHaveBeenCalledOnce();

  expect(assignBatch).toHaveBeenCalledWith(
    [
      {
        targetId,
        scopeType: 'GLOBAL',
        parentAssignmentId: undefined,
        regionId: undefined,
        districtId: undefined,
        branchId: undefined,
        userId: undefined,
        productId: undefined,
        targetValue: 1000,
        rowNumber: 2,
      },
    ],
    currentUser,
  );

  expect(result).toEqual({
    success: true,
    importedAssignments: 1,
    message:
      '1 target assignments imported successfully',
  });
});


    it('confirms multiple valid assignments', async () => {
        assignBatch.mockResolvedValue({
            importedAssignments: 2,
        });

        const result = await service.confirm(
            csv(globalRow, regionRow),
            currentUser,
        );

        expect(assignBatch).toHaveBeenCalledOnce();

        const assignments = assignBatch.mock.calls[0][0];

        expect(assignments).toHaveLength(2);
        expect(result.importedAssignments).toBe(2);
    });

    it('rejects CSV confirmation with invalid rows', async () => {
        const invalidRow = [
            'invalid-uuid',
            'GLOBAL',
            '',
            '',
            '',
            '',
            '',
            '',
            '100',
        ].join(',');

        await expect(
            service.confirm(
                csv(globalRow, invalidRow),
                currentUser,
            ),
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(assignBatch).not.toHaveBeenCalled();
    });

    it('rejects CSV confirmation with no data rows', async () => {
        await expect(
            service.confirm(
                csv(),
                currentUser,
            ),
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(assignBatch).not.toHaveBeenCalled();
    });

    it('propagates batch assignment errors', async () => {
        assignBatch.mockRejectedValue(
            new BadRequestException(
                'Parent target capacity exceeded',
            ),
        );

        await expect(
            service.confirm(
                csv(globalRow),
                currentUser,
            ),
        ).rejects.toThrow(
            'Parent target capacity exceeded',
        );
    });

  it('validates a structurally valid CSV against the database', async () => {
    const result = await service.preview(
      csv(globalRow),
      currentUser,
    );

    expect(validateBatchPreview).toHaveBeenCalledOnce();

    expect(validateBatchPreview).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          targetId,
          scopeType: 'GLOBAL',
          targetValue: 1000,
        }),
      ],
      currentUser,
    );

    expect(result.valid).toBe(true);
    expect(assignBatch).not.toHaveBeenCalled();
  });

  it('reports database validation errors in preview', async () => {
    validateBatchPreview.mockRejectedValue(
      new BadRequestException(
        'Parent target capacity exceeded',
      ),
    );

    const result = await service.preview(
      csv(globalRow),
      currentUser,
    );

    expect(result.valid).toBe(false);
    expect(result.validRows).toBe(0);

    expect(result.errors).toEqual([
      {
        row: 0,
        message: 'Parent target capacity exceeded',
      },
    ]);

    expect(assignBatch).not.toHaveBeenCalled();
  });

  it('skips database validation when CSV parsing fails', async () => {
    const invalidRow = [
      'invalid-uuid',
      'GLOBAL',
      '',
      '',
      '',
      '',
      '',
      '',
      '100',
    ].join(',');

    const result = await service.preview(
      csv(invalidRow),
      currentUser,
    );

    expect(result.valid).toBe(false);
    expect(validateBatchPreview).not.toHaveBeenCalled();
    expect(assignBatch).not.toHaveBeenCalled();
  });

  it('does not hide unexpected database failures', async () => {
    validateBatchPreview.mockRejectedValue(
      new Error('Database connection unavailable'),
    );

    await expect(
      service.preview(
        csv(globalRow),
        currentUser,
      ),
    ).rejects.toThrow(
      'Database connection unavailable',
    );
  });

});
