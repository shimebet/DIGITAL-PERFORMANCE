import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import {
  Transform,
} from 'class-transformer';

function normalizeRequiredString({
  value,
}: {
  value: unknown;
}) {
  if (
    typeof value !==
    'string'
  ) {
    return value;
  }

  return value.trim();
}

function normalizeOptionalString({
  value,
}: {
  value: unknown;
}) {
  if (
    value === null ||
    value === undefined
  ) {
    return value;
  }

  if (
    typeof value !==
    'string'
  ) {
    return value;
  }

  const normalized =
    value.trim();

  return normalized === ''
    ? null
    : normalized;
}

export class UpdateMyProfileDto {
  @IsOptional()
  @Transform(
    normalizeRequiredString,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @Transform(
    normalizeOptionalString,
  )
  @IsString()
  @MaxLength(100)
  middleName?: string | null;

  @IsOptional()
  @Transform(
    normalizeRequiredString,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @Transform(
    normalizeOptionalString,
  )
  @IsEmail()
  @MaxLength(191)
  email?: string | null;

  @IsOptional()
  @Transform(
    normalizeOptionalString,
  )
  @IsString()
  @MaxLength(50)
  phone?: string | null;
}