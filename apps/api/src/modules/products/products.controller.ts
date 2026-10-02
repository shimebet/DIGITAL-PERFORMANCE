import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import {
  ProductsService,
} from './products.service.js';

import {
  CreateProductDto,
} from './dto/create-product.dto.js';

import {
  UpdateProductDto,
} from './dto/update-product.dto.js';

import {
  Permissions,
} from '../auth/decorators/permissions.decorator.js';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService:
      ProductsService,
  ) {}

  @Post()
  @Permissions('product.create')
  create(
    @Body()
    dto: CreateProductDto,
  ) {
    return this.productsService.create(
      dto,
    );
  }

  @Get()
  @Permissions('product.read')
  findAll(
    @Query('includeInactive')
    includeInactive?: string,
  ) {
    return this.productsService.findAll(
      includeInactive === 'true',
    );
  }

  @Get(':id')
  @Permissions('product.read')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.productsService.findOne(
      id,
    );
  }

  @Patch(':id')
  @Permissions('product.update')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateProductDto,
  ) {
    return this.productsService.update(
      id,
      dto,
    );
  }

  @Delete(':id')
  @Permissions('product.update')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.productsService.remove(
      id,
    );
  }
}