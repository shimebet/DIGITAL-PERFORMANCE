import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateBranchDto {
  @IsUUID()
  @IsNotEmpty()
  districtId: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: "code cannot be empty or whitespace only" })
  @MaxLength(50)
  code: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: "name cannot be empty or whitespace only" })
  @MaxLength(191)
  name: string;

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
}
