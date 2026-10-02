import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

import {
  FollowUpPriority,
} from '../../../generated/prisma/enums.js';

export class CreateFollowUpDto {
  @IsOptional()
  @IsUUID()
  activityId?: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsUUID()
  assignedToUserId: string;

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

  @IsEnum(FollowUpPriority)
  priority: FollowUpPriority;

  @IsDateString()
  followUpDate: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}