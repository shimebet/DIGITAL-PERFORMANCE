
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

import {
  ScopeType,
} from '../../../generated/prisma/enums.js';

export class AssignTargetDto {
  @IsUUID()
  targetId: string;

  @IsEnum(ScopeType)
  scopeType: ScopeType;

  // Parent allocation from the immediately higher organizational level.
  // Optional during the compatibility phase for existing assignments.
  @IsOptional()
  @IsUUID()
  parentAssignmentId?: string;

  @IsOptional()
  @IsUUID()
  regionId?: string;

  @IsOptional()
  @IsUUID()
  districtId?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsNumber()
  @Min(0)
  targetValue: number;
}
