import {
  IsOptional,
  IsString,
} from 'class-validator';

export class ReviewSubmissionDto {
  @IsOptional()
  @IsString()
  remarks?: string;
}