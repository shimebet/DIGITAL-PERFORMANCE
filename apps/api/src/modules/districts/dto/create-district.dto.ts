import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateDistrictDto {
  @IsUUID()
  @IsNotEmpty()
  regionId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}