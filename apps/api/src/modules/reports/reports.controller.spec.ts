
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Response } from 'express';

import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';

describe('ReportsController', () => {
  let controller: ReportsController;

  const reportsServiceMock = {
    getPerformanceReport: vi.fn(),
    exportCsv: vi.fn(),
    exportExcel: vi.fn(),
  };

  const responseMock = {
    setHeader: vi.fn(),
    send: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();

    controller = new ReportsController(
      reportsServiceMock as unknown as ReportsService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('returns a performance report', async () => {
    const query =
      {} as Parameters<ReportsController['getPerformance']>[0];

    const user =
      {} as Parameters<ReportsController['getPerformance']>[1];

    const expected = {
      summary: { activations: 100 },
      trend: [],
      products: [],
    };

    reportsServiceMock.getPerformanceReport.mockResolvedValue(expected);

    const result = await controller.getPerformance(query, user);

    expect(
      reportsServiceMock.getPerformanceReport,
    ).toHaveBeenCalledWith(query, user);

    expect(result).toEqual(expected);
  });

  it('exports CSV with the correct headers and content', async () => {
    const query =
      {} as Parameters<ReportsController['exportCsv']>[0];

    const user =
      {} as Parameters<ReportsController['exportCsv']>[1];

    const csv = '"Date","Activations"\n"2026-10-13","10"';

    reportsServiceMock.exportCsv.mockResolvedValue(csv);

    await controller.exportCsv(
      query,
      user,
      responseMock as unknown as Response,
    );

    expect(reportsServiceMock.exportCsv).toHaveBeenCalledWith(
      query,
      user,
    );

    expect(responseMock.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'text/csv; charset=utf-8',
    );

    expect(responseMock.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="performance-report.csv"',
    );

    expect(responseMock.send).toHaveBeenCalledWith(csv);
  });

  it('exports Excel with the correct headers and file content', async () => {
    const query =
      {} as Parameters<ReportsController['exportExcel']>[0];

    const user =
      {} as Parameters<ReportsController['exportExcel']>[1];

    const file = Buffer.from('mock-excel-content');

    reportsServiceMock.exportExcel.mockResolvedValue(file);

    await controller.exportExcel(
      query,
      user,
      responseMock as unknown as Response,
    );

    expect(reportsServiceMock.exportExcel).toHaveBeenCalledWith(
      query,
      user,
    );

    expect(responseMock.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    expect(responseMock.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="performance-report.xlsx"',
    );

    expect(responseMock.send).toHaveBeenCalledWith(file);
  });

  it('does not send CSV data if report generation fails', async () => {
    const query =
      {} as Parameters<ReportsController['exportCsv']>[0];

    const user =
      {} as Parameters<ReportsController['exportCsv']>[1];

    reportsServiceMock.exportCsv.mockRejectedValue(
      new Error('Report generation failed'),
    );

    await expect(
      controller.exportCsv(
        query,
        user,
        responseMock as unknown as Response,
      ),
    ).rejects.toThrow('Report generation failed');

    expect(responseMock.send).not.toHaveBeenCalled();
  });

  it('does not send Excel data if report generation fails', async () => {
    const query =
      {} as Parameters<ReportsController['exportExcel']>[0];

    const user =
      {} as Parameters<ReportsController['exportExcel']>[1];

    reportsServiceMock.exportExcel.mockRejectedValue(
      new Error('Excel generation failed'),
    );

    await expect(
      controller.exportExcel(
        query,
        user,
        responseMock as unknown as Response,
      ),
    ).rejects.toThrow('Excel generation failed');

    expect(responseMock.send).not.toHaveBeenCalled();
  });
});
