import {
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';

import {
  ScopeType,
} from '../../../generated/prisma/enums.js';

export class AssignUserRoleDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  roleId: string;

  @IsEnum(ScopeType)
  scopeType: ScopeType;

  @IsOptional()
  @IsUUID()
  regionId?: string;

  @IsOptional()
  @IsUUID()
  districtId?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;
}