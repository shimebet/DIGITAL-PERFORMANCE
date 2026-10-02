import {
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';

import {
  AlertSeverity,
  AlertStatus,
} from '../../../generated/prisma/enums.js';

export class AlertQueryDto {
  @IsOptional()
  @IsEnum(AlertStatus)
  status?: AlertStatus;

  @IsOptional()
  @IsEnum(AlertSeverity)
  severity?: AlertSeverity;

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