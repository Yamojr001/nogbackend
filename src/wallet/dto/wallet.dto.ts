import { IsEnum, IsNumber, IsOptional, IsString, IsPositive, Min } from 'class-validator';
import { WalletType } from '../../entities/wallet.entity';

export class CreateWalletDto {
  @IsEnum(WalletType)
  type: WalletType;

  @IsNumber()
  @IsOptional()
  @Min(0)
  balance?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsNumber()
  @IsOptional()
  ownerId?: number;

  @IsEnum(WalletType)
  @IsOptional()
  ownerType?: WalletType;
}

export class DepositDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  @IsOptional()
  description?: string;
}

export class WithdrawDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  code?: string;
}

export class TransferDto {
  @IsNumber()
  fromWalletId: number;

  @IsNumber()
  toWalletId: number;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsNumber()
  @IsOptional()
  organisationId?: number;

  @IsString()
  @IsOptional()
  code?: string;
}
