import { IsNumber, IsPositive, IsNotEmpty, IsOptional, IsInt, IsString } from 'class-validator';

export class CreateContributionDto {
  @IsInt()
  @IsNotEmpty()
  memberId: number;

  @IsInt()
  @IsOptional()
  groupId?: number;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsInt()
  @IsNotEmpty()
  organisationId: number;
}
