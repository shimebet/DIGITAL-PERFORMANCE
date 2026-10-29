
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

import {
  FollowUpPriority,
} from '../../../generated/prisma/enums.js';

export class UpdateFollowUpDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  customerReference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  customerNameMasked?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  contactReference?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsEnum(FollowUpPriority)
  priority?: FollowUpPriority;

  @IsOptional()
  @IsDateString()
  followUpDate?: string;

  @IsOptional()
  @IsDateString()
  nextFollowUpDate?: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsString()
  outcome?: string;
}
