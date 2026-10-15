
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';

describe('ProductsController', () => {
  let controller: ProductsController;

  const productsServiceMock = {
    create: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();

    controller = new ProductsController(
      productsServiceMock as unknown as ProductsService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('creates a product', async () => {
    const dto =
      {} as Parameters<ProductsController['create']>[0];

    const expected = {
      id: 'product-1',
      code: 'CBE_BIRR',
    };

    productsServiceMock.create.mockResolvedValue(expected);

    const result = await controller.create(dto);

    expect(productsServiceMock.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual(expected);
  });

  it('lists active products by default', async () => {
    const expected = [{ id: 'product-1' }];

    productsServiceMock.findAll.mockResolvedValue(expected);

    const result = await controller.findAll();

    expect(productsServiceMock.findAll).toHaveBeenCalledWith(false);
    expect(result).toEqual(expected);
  });

  it('includes inactive products when requested', async () => {
    const expected = [
      { id: 'product-1', status: 'ACTIVE' },
      { id: 'product-2', status: 'INACTIVE' },
    ];

    productsServiceMock.findAll.mockResolvedValue(expected);

    const result = await controller.findAll('true');

    expect(productsServiceMock.findAll).toHaveBeenCalledWith(true);
    expect(result).toEqual(expected);
  });

  it('does not include inactive products for other query values', async () => {
    productsServiceMock.findAll.mockResolvedValue([]);

    await controller.findAll('false');

    expect(productsServiceMock.findAll).toHaveBeenCalledWith(false);
  });

  it('returns a product by ID', async () => {
    const expected = {
      id: 'product-1',
      name: 'CBE Birr',
    };

    productsServiceMock.findOne.mockResolvedValue(expected);

    const result = await controller.findOne('product-1');

    expect(productsServiceMock.findOne).toHaveBeenCalledWith(
      'product-1',
    );
    expect(result).toEqual(expected);
  });

  it('updates a product', async () => {
    const dto =
      {} as Parameters<ProductsController['update']>[1];

    const expected = {
      id: 'product-1',
      name: 'Updated Product',
    };

    productsServiceMock.update.mockResolvedValue(expected);

    const result = await controller.update('product-1', dto);

    expect(productsServiceMock.update).toHaveBeenCalledWith(
      'product-1',
      dto,
    );
    expect(result).toEqual(expected);
  });

  it('removes a product', async () => {
    const expected = {
      id: 'product-1',
      status: 'INACTIVE',
    };

    productsServiceMock.remove.mockResolvedValue(expected);

    const result = await controller.remove('product-1');

    expect(productsServiceMock.remove).toHaveBeenCalledWith(
      'product-1',
    );
    expect(result).toEqual(expected);
  });
});
