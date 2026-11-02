import { IsNotEmpty,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Matches,
} from 'class-validator';

import { RecordStatus } from '../../../generated/prisma/enums.js';

export class UpdateBranchDto {
  @IsOptional()
  @IsUUID()
  districtId?: string;

  @IsOptional()
  @IsString()
  @Matches(/\S/, { message: "code cannot be empty or whitespace only" })
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  @Matches(/\S/, { message: "name cannot be empty or whitespace only" })
  @MaxLength(191)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  branchType?: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^(?:0[79]\d{8}|\+251[79]\d{8}|251[79]\d{8})$/, {
    message: 'Phone must be a valid Ethiopian mobile number',
  })
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsEmail()
  @Matches(/^[A-Z0-9._%+-]+@cbe\.com\.et$/i, {
    message: 'Email must be a valid @cbe.com.et address',
  })
  @MaxLength(191)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;

  @IsOptional()
  @IsEnum(RecordStatus)
  status?: RecordStatus;
}
