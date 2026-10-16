import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import {
  Type,
} from 'class-transformer';

import {
  SavedReportFiltersDto,
} from './create-saved-report.dto.js';

export class UpdateSavedReportDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  name?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SavedReportFiltersDto)
  filters?: SavedReportFiltersDto;
}
