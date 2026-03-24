import { IsArray, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SyncContributionDto {
  @IsInt()
  @IsNotEmpty()
  memberId: number;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  @IsOptional()
  date?: string;
}

export class SyncMemberUpdateDto {
  @IsInt()
  @IsNotEmpty()
  memberId: number;

  @IsString()
  @IsOptional()
  phone?: string;
}

export class GroupSyncDto {
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SyncContributionDto)
  contributions?: SyncContributionDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SyncMemberUpdateDto)
  memberUpdates?: SyncMemberUpdateDto[];
}

export class MarkAttendanceDto {
  @IsString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsNotEmpty()
  status: string;
}
