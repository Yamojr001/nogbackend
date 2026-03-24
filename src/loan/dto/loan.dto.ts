import { IsNumber, IsPositive, IsNotEmpty, IsEnum, IsOptional, IsInt, Min } from 'class-validator';
import { LoanStatus } from '../../entities/loan.entity';

export class CreateLoanDto {
  @IsInt()
  @IsNotEmpty()
  memberId: number;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsNumber()
  @Min(0)
  interestRate: number;

  @IsInt()
  @IsPositive()
  duration: number;

  @IsEnum(LoanStatus)
  @IsOptional()
  status?: LoanStatus;

  @IsInt()
  @IsNotEmpty()
  organisationId: number;
}

export class RequestLoanDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsNumber()
  @Min(0)
  interestRate: number;

  @IsInt()
  @IsPositive()
  term: number;
}
