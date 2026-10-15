
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { ProductsService } from './products.service.js';

import { PrismaService } from '../../database/prisma/prisma.service.js';

describe('ProductsService', () => {
  let service: ProductsService;

  const prismaMock = {
    product: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.resetAllMocks();

    service = new ProductsService(
      prismaMock as unknown as PrismaService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects duplicate product codes', async () => {
    const dto = {
      code: 'cbe_birr',
      name: 'CBE Birr',
    } as Parameters<ProductsService['create']>[0];

    prismaMock.product.findUnique.mockResolvedValue({
      id: 'existing-product',
      code: 'CBE_BIRR',
    });

    await expect(
      service.create(dto),
    ).rejects.toThrow(ConflictException);

    expect(prismaMock.product.findUnique).toHaveBeenCalledWith({
      where: {
        code: 'CBE_BIRR',
      },
    });

    expect(prismaMock.product.create).not.toHaveBeenCalled();
  });

  it('normalizes product fields before creation', async () => {
    const dto = {
      code: ' mobile_banking ',
      name: ' Mobile Banking ',
      category: ' digital_banking ',
      description: ' Mobile banking channel ',
      displayOrder: 2,
    } as Parameters<ProductsService['create']>[0];

    prismaMock.product.findUnique.mockResolvedValue(null);

    const expected = {
      id: 'product-1',
      code: 'MOBILE_BANKING',
      name: 'Mobile Banking',
    };

    prismaMock.product.create.mockResolvedValue(expected);

    const result = await service.create(dto);

    expect(prismaMock.product.create).toHaveBeenCalledWith({
      data: {
        code: 'MOBILE_BANKING',
        name: 'Mobile Banking',
        category: 'DIGITAL_BANKING',
        description: 'Mobile banking channel',
        displayOrder: 2,
      },
    });

    expect(result).toEqual(expected);
  });

  it('defaults displayOrder to zero', async () => {
    const dto = {
      code: 'QR',
      name: 'QR',
    } as Parameters<ProductsService['create']>[0];

    prismaMock.product.findUnique.mockResolvedValue(null);
    prismaMock.product.create.mockResolvedValue({
      id: 'product-2',
    });

    await service.create(dto);

    expect(prismaMock.product.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        code: 'QR',
        displayOrder: 0,
      }),
    });
  });

  it('lists only active non-deleted products by default', async () => {
    prismaMock.product.findMany.mockResolvedValue([]);

    await service.findAll();

    expect(prismaMock.product.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
      },
      orderBy: [
        { displayOrder: 'asc' },
        { name: 'asc' },
      ],
    });
  });

  it('includes inactive non-deleted products when requested', async () => {
    prismaMock.product.findMany.mockResolvedValue([]);

    await service.findAll(true);

    expect(prismaMock.product.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
      },
      orderBy: [
        { displayOrder: 'asc' },
        { name: 'asc' },
      ],
    });
  });

  it('throws NotFoundException when a product does not exist', async () => {
    prismaMock.product.findFirst.mockResolvedValue(null);

    await expect(
      service.findOne('missing-product'),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.product.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'missing-product',
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            activityProducts: true,
            targetAssignments: true,
            followUps: true,
          },
        },
      },
    });
  });

  it('returns an existing product with usage counts', async () => {
    const expected = {
      id: 'product-1',
      code: 'CBE_BIRR',
      _count: {
        activityProducts: 5,
        targetAssignments: 2,
        followUps: 3,
      },
    };

    prismaMock.product.findFirst.mockResolvedValue(expected);

    const result = await service.findOne('product-1');

    expect(result).toEqual(expected);
  });

  it('does not update a product that does not exist', async () => {
    const dto =
      {} as Parameters<ProductsService['update']>[1];

    prismaMock.product.findFirst.mockResolvedValue(null);

    await expect(
      service.update('missing-product', dto),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.product.update).not.toHaveBeenCalled();
  });
});
