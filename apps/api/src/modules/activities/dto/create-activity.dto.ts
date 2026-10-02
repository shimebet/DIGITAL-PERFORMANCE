import {
  Type,
} from 'class-transformer';

import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

import {
  ActivityProductDto,
} from './activity-product.dto.js';

export class CreateActivityDto {
  @IsDateString()
  activityDate: string;

  @IsInt()
  @Min(0)
  customerVisits: number;

  @IsInt()
  @Min(0)
  phoneCalls: number;

  @IsInt()
  @Min(0)
  customersContacted: number;

  @IsInt()
  @Min(0)
  customersEducated: number;

  @IsInt()
  @Min(0)
  activations: number;

  @IsInt()
  @Min(0)
  reactivations: number;

  @IsInt()
  @Min(0)
  transactions: number;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsString()
  challenges?: string;

  @IsArray()
  @ValidateNested({
    each: true,
  })
  @Type(
    () =>
      ActivityProductDto,
  )
  products: ActivityProductDto[];
}