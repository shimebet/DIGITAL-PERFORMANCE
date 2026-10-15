
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppService } from './app.service.js';
import { PrismaService } from './database/prisma/prisma.service.js';

describe('AppService', () => {
  let service: AppService;

  const prismaMock = {
    $queryRaw: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();

    service = new AppService(
      prismaMock as unknown as PrismaService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns healthy status when database is connected', async () => {
    prismaMock.$queryRaw.mockResolvedValue([
      { result: 1 },
    ]);

    const result = await service.getHealth();

    expect(result).toEqual({
      success: true,
      application: 'Digital Performance Monitoring Platform',
      service: 'API',
      status: 'running',
      database: {
        status: 'connected',
      },
      timestamp: expect.any(String),
    });

    expect(prismaMock.$queryRaw).toHaveBeenCalledOnce();

    expect(
      Number.isNaN(Date.parse(result.timestamp)),
    ).toBe(false);
  });

  it('returns unknown database status when query result is empty', async () => {
    prismaMock.$queryRaw.mockResolvedValue([]);

    const result = await service.getHealth();

    expect(result.database.status).toBe('unknown');
    expect(result.success).toBe(true);
  });

  it('returns unknown database status when result is not 1', async () => {
    prismaMock.$queryRaw.mockResolvedValue([
      { result: 0 },
    ]);

    const result = await service.getHealth();

    expect(result.database.status).toBe('unknown');
  });

  it('propagates database connection errors', async () => {
    prismaMock.$queryRaw.mockRejectedValue(
      new Error('Database connection failed'),
    );

    await expect(
      service.getHealth(),
    ).rejects.toThrow('Database connection failed');
  });
});
