import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class ActivityProductDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(0)
  customersEngaged: number;

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
  @IsInt()
  @Min(0)
  failedActivations?: number;

  @IsOptional()
  @IsString()
  remarks?: string;
}