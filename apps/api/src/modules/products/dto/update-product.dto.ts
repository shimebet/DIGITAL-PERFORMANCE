import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

import {
  RecordStatus,
} from '../../../generated/prisma/enums.js';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(191)
  @Matches(/\S/, {
    message: 'Product name cannot be empty or whitespace only',
  })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @IsEnum(RecordStatus)
  status?: RecordStatus;
}