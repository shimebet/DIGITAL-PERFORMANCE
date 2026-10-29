
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

  // Organizational scope for BRANCH roles.
  @IsOptional()
  @IsUUID()
  branchId?: string;

  // Staff workplace, used only when assigning
  // DIGITAL_RESKILLED_STAFF at STAFF scope.
  @IsOptional()
  @IsUUID()
  staffBranchId?: string;
}
