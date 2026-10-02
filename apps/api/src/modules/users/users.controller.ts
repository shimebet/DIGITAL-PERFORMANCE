import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

import {
  Permissions,
} from '../auth/decorators/permissions.decorator.js';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @Post()
  @Permissions('user.create')
  create(
    @Body()
    dto: CreateUserDto,
  ) {
    return this.usersService.create(dto);
  }

  @Get()
  @Permissions('user.read')
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Permissions('user.read')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Permissions('user.update')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateUserDto,
  ) {
    return this.usersService.update(
      id,
      dto,
    );
  }

  @Delete(':id')
  @Permissions('user.delete')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.usersService.softDelete(id);
  }
}