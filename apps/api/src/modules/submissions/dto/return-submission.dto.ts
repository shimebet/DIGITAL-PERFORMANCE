import {
  IsNotEmpty,
  IsString,
} from 'class-validator';

export class ReturnSubmissionDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}