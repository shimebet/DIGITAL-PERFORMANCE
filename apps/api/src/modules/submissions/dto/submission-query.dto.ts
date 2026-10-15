import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class SubmissionQueryDto {
  @IsOptional()
  @IsString()
  regionId?: string;

  @IsOptional()
  @IsString()
  districtId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  staffId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsIn([
    'DRAFT',
    'SUBMITTED',
    'RESUBMITTED',
    'REVIEWED',
    'APPROVED',
    'RETURNED_FOR_CORRECTION',
  ])
  status?: string;
}
