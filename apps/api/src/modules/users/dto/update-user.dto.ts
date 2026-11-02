
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Matches,
} from 'class-validator';

import { UserStatus } from '../../../generated/prisma/enums.js';

export class UpdateUserDto {
  // Username editing is restricted to global SUPER_ADMIN
  // by the authorization check in users.controller.ts.
  @IsOptional()
  @IsString()
  @IsNotEmpty()
    @Matches(/\S/, { message: "username cannot be empty or whitespace only" })
  @MaxLength(100)
  username?: string;


  @IsOptional()
  @IsEmail()
  @Matches(/^[A-Z0-9._%+-]+@cbe\.com\.et$/i, {
    message: 'Email must be a valid @cbe.com.et address',
  })
  @MaxLength(191)
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(?:0[79]\d{8}|\+251[79]\d{8}|251[79]\d{8})$/, {
    message: 'Phone must be a valid Ethiopian mobile number',
  })
  phone?: string;


  @IsOptional()
  @IsString()
    @Matches(/\S/, { message: "firstName cannot be empty or whitespace only" })
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  middleName?: string;

  @IsOptional()
  @IsString()
    @Matches(/\S/, { message: "lastName cannot be empty or whitespace only" })
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  employeeNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  jobTitle?: string;
}
