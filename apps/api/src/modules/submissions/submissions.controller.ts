import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { SubmissionsService } from './submissions.service.js';

import { CreateSubmissionDto } from './dto/create-submission.dto.js';

import { ReturnSubmissionDto } from './dto/return-submission.dto.js';

import { SubmissionQueryDto } from './dto/submission-query.dto.js';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

import { Permissions } from '../auth/decorators/permissions.decorator.js';

import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import { ApproveSubmissionDto } from './dto/approve-submission.dto.js';

@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  // ==========================================================================
  // CREATE STAFF DAILY DRAFT
  // ==========================================================================

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

  // ==========================================================================
  // CURRENT USER'S OWN SUBMISSIONS
  //
  // Important:
  // Keep "mine" before ":id".
  // ==========================================================================

  @Get('mine')
  @Permissions('submission.read')
  mine(
    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.submissionsService.mine(user);
  }

  // ==========================================================================
  // SCOPED SUBMISSION LIST
  //
  // GET /api/submissions
  //
  // Used by:
  // - Branch Manager
  // - District Manager
  // - District Analyst
  // - Regional Manager
  // - Regional Analyst
  // - Global users
  // - Super Admin
  //
  // STAFF scope remains restricted to own records by service.
  // ==========================================================================

  @Get()
  @Permissions('submission.read')
  findAll(
    @Query()
    query: SubmissionQueryDto,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.submissionsService.findAll(query, user);
  }

  // ==========================================================================
  // SINGLE SUBMISSION
  // ==========================================================================

  @Get(':id')
  @Permissions('submission.read')
  findOne(
    @Param('id')
    id: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.submissionsService.findOne(id, user);
  }

  // ==========================================================================
  // STAFF SUBMIT / RESUBMIT
  // ==========================================================================

  @Post(':id/submit')
  @Permissions('submission.submit')
  submit(
    @Param('id')
    id: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.submissionsService.submit(id, user);
  }

  // ==========================================================================
  // MANAGER REVIEW
  // ==========================================================================

  @Post(':id/review')
  @Permissions('submission.review')
  review(
    @Param('id')
    id: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.submissionsService.review(id, user);
  }

  // ==========================================================================
  // MANAGER APPROVAL
  // ==========================================================================
@Post(':id/approve')
@Permissions('submission.approve')
approve(
  @Param('id')
  id: string,

  @Body()
  dto: ApproveSubmissionDto,

  @CurrentUser()
  user: AuthenticatedUser,
) {
  return this.submissionsService.approve(
    id,
    user,
    dto?.reason,
  );
}

  // ==========================================================================
  // RETURN FOR CORRECTION
  // ==========================================================================

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
    return this.submissionsService.returnForCorrection(id, dto.reason, user);
  }
}
