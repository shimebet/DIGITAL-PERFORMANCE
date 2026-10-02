import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';

import {
  SubmissionsService,
} from './submissions.service.js';

import {
  CreateSubmissionDto,
} from './dto/create-submission.dto.js';

import {
  ReturnSubmissionDto,
} from './dto/return-submission.dto.js';

import {
  CurrentUser,
} from '../auth/decorators/current-user.decorator.js';

import {
  Permissions,
} from '../auth/decorators/permissions.decorator.js';

import type {
  AuthenticatedUser,
} from '../auth/interfaces/authenticated-user.interface.js';

@Controller('submissions')
export class SubmissionsController {
  constructor(
    private readonly submissionsService:
      SubmissionsService,
  ) {}

  @Post()
  @Permissions('submission.submit')
  createDraft(
    @Body()
    dto: CreateSubmissionDto,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.submissionsService.createDraft(
      dto.submissionDate,
      dto.remarks,
      user,
    );
  }

  @Get('mine')
  @Permissions('submission.read')
  mine(
    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.submissionsService.mine(
      user,
    );
  }

  @Get(':id')
  @Permissions('submission.read')
  findOne(
    @Param('id')
    id: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.submissionsService.findOne(
      id,
      user,
    );
  }

  @Post(':id/submit')
  @Permissions('submission.submit')
  submit(
    @Param('id')
    id: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.submissionsService.submit(
      id,
      user,
    );
  }

  @Post(':id/review')
  @Permissions('submission.review')
  review(
    @Param('id')
    id: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.submissionsService.review(
      id,
      user,
    );
  }

  @Post(':id/approve')
  @Permissions('submission.approve')
  approve(
    @Param('id')
    id: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.submissionsService.approve(
      id,
      user,
    );
  }

  @Post(':id/return')
  @Permissions('submission.review')
  returnForCorrection(
    @Param('id')
    id: string,

    @Body()
    dto: ReturnSubmissionDto,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.submissionsService.returnForCorrection(
      id,
      dto.reason,
      user,
    );
  }
}