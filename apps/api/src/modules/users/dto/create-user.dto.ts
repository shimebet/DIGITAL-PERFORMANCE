import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
    @Matches(/\S/, { message: "username cannot be empty or whitespace only" })
  @MaxLength(100)
  username: string;


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


  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: "Password cannot contain only spaces" })
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
    @Matches(/\S/, { message: "firstName cannot be empty or whitespace only" })
  @MaxLength(100)
  firstName: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  middleName?: string;

  @IsString()
  @IsNotEmpty()
    @Matches(/\S/, { message: "lastName cannot be empty or whitespace only" })
  @MaxLength(100)
  lastName: string;

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

  @IsOptional()
  @IsBoolean()
  digitalReskilled?: boolean;
}
