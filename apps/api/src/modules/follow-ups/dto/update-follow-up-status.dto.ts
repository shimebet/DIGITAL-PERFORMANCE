import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

import {
  FollowUpStatus,
} from '../../../generated/prisma/enums.js';

export class UpdateFollowUpStatusDto {
  @IsEnum(FollowUpStatus)
  status: FollowUpStatus;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  outcome?: string;

  @IsOptional()
  @IsDateString()
  nextFollowUpDate?: string;
}