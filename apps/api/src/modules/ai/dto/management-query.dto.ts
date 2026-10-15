import {
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

import {
  AiQueryDto,
} from './ai-query.dto.js';

export class ManagementQueryDto
  extends AiQueryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  question: string;
}