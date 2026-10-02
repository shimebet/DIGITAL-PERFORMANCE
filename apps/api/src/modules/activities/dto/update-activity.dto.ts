import {
  Type,
} from 'class-transformer';

import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

import {
  ActivityProductDto,
} from './activity-product.dto.js';

export class UpdateActivityDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  customerVisits?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  phoneCalls?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  customersContacted?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  customersEducated?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  activations?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  reactivations?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  transactions?: number;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsString()
  challenges?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({
    each: true,
  })
  @Type(
    () =>
      ActivityProductDto,
  )
  products?: ActivityProductDto[];
}