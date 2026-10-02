import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

import {
  MetricType,
  RecordStatus,
  TargetPeriod,
} from '../../../generated/prisma/enums.js';

export class UpdateTargetDto {
  @IsOptional()
  @IsString()
  @MaxLength(191)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(MetricType)
  metricType?: MetricType;

  @IsOptional()
  @IsEnum(TargetPeriod)
  periodType?: TargetPeriod;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultTargetValue?: number;

  @IsOptional()
  @IsEnum(RecordStatus)
  status?: RecordStatus;
}