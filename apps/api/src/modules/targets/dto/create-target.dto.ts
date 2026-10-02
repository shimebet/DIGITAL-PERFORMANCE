import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

import {
  MetricType,
  TargetPeriod,
} from '../../../generated/prisma/enums.js';

export class CreateTargetDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(MetricType)
  metricType: MetricType;

  @IsEnum(TargetPeriod)
  periodType: TargetPeriod;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultTargetValue?: number;
}