
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReportsService } from './reports.service.js';

import { PerformanceService } from '../performance/performance.service.js';

describe('ReportsService', () => {
  let service: ReportsService;

  const performanceServiceMock = {
    summary: vi.fn(),
    dailyTrend: vi.fn(),
    productComparison: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();

    service = new ReportsService(
      performanceServiceMock as unknown as PerformanceService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('combines performance summary, trend, and products', async () => {
    const query =
      {} as Parameters<ReportsService['getPerformanceReport']>[0];

    const user =
      {} as Parameters<ReportsService['getPerformanceReport']>[1];

    const summary = { totalActivations: 100 };
    const trend = [{ date: '2026-10-13' }];
    const products = [{ productId: 'product-1' }];

    performanceServiceMock.summary.mockResolvedValue(summary);
    performanceServiceMock.dailyTrend.mockResolvedValue(trend);
    performanceServiceMock.productComparison.mockResolvedValue(products);

    const result = await service.getPerformanceReport(query, user);

    expect(performanceServiceMock.summary).toHaveBeenCalledWith(
      query,
      user,
    );

    expect(performanceServiceMock.dailyTrend).toHaveBeenCalledWith(
      query,
      user,
    );

    expect(performanceServiceMock.productComparison).toHaveBeenCalledWith(
      query,
      user,
    );

    expect(result).toEqual({
      generatedAt: expect.any(Date),
      filters: query,
      summary,
      trend,
      products,
    });
  });

  it('propagates performance summary errors', async () => {
    const query =
      {} as Parameters<ReportsService['getPerformanceReport']>[0];

    const user =
      {} as Parameters<ReportsService['getPerformanceReport']>[1];

    performanceServiceMock.summary.mockRejectedValue(
      new Error('Performance access denied'),
    );

    await expect(
      service.getPerformanceReport(query, user),
    ).rejects.toThrow('Performance access denied');

    expect(
      performanceServiceMock.dailyTrend,
    ).not.toHaveBeenCalled();

    expect(
      performanceServiceMock.productComparison,
    ).not.toHaveBeenCalled();
  });

  it('generates CSV headers and daily performance rows', async () => {
    const query =
      {} as Parameters<ReportsService['exportCsv']>[0];

    const user =
      {} as Parameters<ReportsService['exportCsv']>[1];

    performanceServiceMock.summary.mockResolvedValue({});

    performanceServiceMock.dailyTrend.mockResolvedValue([
      {
        date: '2026-10-13',
        customerVisits: 20,
        customersContacted: 15,
        customersEducated: 12,
        activations: 8,
        reactivations: 2,
        transactions: 10,
        conversionRate: 66.67,
        transactionRate: 83.33,
      },
    ]);

    performanceServiceMock.productComparison.mockResolvedValue([]);

    const csv = await service.exportCsv(query, user);

    const lines = csv.split('\n');

    expect(lines).toHaveLength(2);

    expect(lines[0]).toBe(
      '"Date","Customer Visits","Customers Contacted",' +
      '"Customers Educated","Activations","Reactivations",' +
      '"Transactions","Conversion Rate","Transaction Rate"',
    );

    expect(lines[1]).toBe(
      '"2026-10-13","20","15","12","8","2","10","66.67","83.33"',
    );
  });

  it('escapes quotation marks in CSV values', async () => {
    const query =
      {} as Parameters<ReportsService['exportCsv']>[0];

    const user =
      {} as Parameters<ReportsService['exportCsv']>[1];

    performanceServiceMock.summary.mockResolvedValue({});

    performanceServiceMock.dailyTrend.mockResolvedValue([
      {
        date: '2026-10-"13"',
        customerVisits: 1,
        customersContacted: 1,
        customersEducated: 1,
        activations: 1,
        reactivations: 0,
        transactions: 1,
        conversionRate: 100,
        transactionRate: 100,
      },
    ]);

    performanceServiceMock.productComparison.mockResolvedValue([]);

    const csv = await service.exportCsv(query, user);

    expect(csv).toContain('"2026-10-""13"""');
  });

  it('generates CSV with headers when the trend is empty', async () => {
    const query =
      {} as Parameters<ReportsService['exportCsv']>[0];

    const user =
      {} as Parameters<ReportsService['exportCsv']>[1];

    performanceServiceMock.summary.mockResolvedValue({});
    performanceServiceMock.dailyTrend.mockResolvedValue([]);
    performanceServiceMock.productComparison.mockResolvedValue([]);

    const csv = await service.exportCsv(query, user);

    expect(csv.split('\n')).toHaveLength(1);
    expect(csv).toContain('"Customer Visits"');
    expect(csv).toContain('"Conversion Rate"');
  });
});
