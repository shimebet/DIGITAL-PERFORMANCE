import {
  IsNotEmpty,
  IsUUID,
} from 'class-validator';

export class ReassignFollowUpDto {
  @IsNotEmpty()
  @IsUUID()
  assignedToUserId!: string;
}
