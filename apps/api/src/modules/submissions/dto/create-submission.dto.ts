import {
  IsDateString,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateSubmissionDto {
  @IsDateString()
  submissionDate: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}