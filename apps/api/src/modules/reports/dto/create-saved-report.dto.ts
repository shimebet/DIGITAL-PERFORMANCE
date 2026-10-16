import {
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
  IsDateString,
  IsUUID,
} from 'class-validator';

import {
  Type,
} from 'class-transformer';

export class SavedReportFiltersDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

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
  staffId?: string;

  @IsOptional()
  @IsUUID()
  productId?: string;
}

export class CreateSavedReportDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  name!: string;

  @IsOptional()
  @IsIn(['PERFORMANCE'])
  reportType?: 'PERFORMANCE';

  @IsObject()
  @ValidateNested()
  @Type(() => SavedReportFiltersDto)
  filters!: SavedReportFiltersDto;
}
