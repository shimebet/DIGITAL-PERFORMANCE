import {
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class ManagementQueryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  question: string;
}