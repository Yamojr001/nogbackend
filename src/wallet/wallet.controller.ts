import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Wallet } from '../entities/wallet.entity';
import { LedgerService } from '../ledger/ledger.service';
import { UserRole } from '../entities/user.entity';
import { CreateWalletDto, DepositDto, WithdrawDto, TransferDto } from './dto/wallet.dto';

@Controller('wallets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly ledgerService: LedgerService,
  ) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN)
  create(@Body() data: CreateWalletDto) {
    return this.walletService.create(data);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN, UserRole.AUDITOR, UserRole.PARTNER_ADMIN)
  findAll() {
    return this.walletService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN, UserRole.AUDITOR, UserRole.PARTNER_ADMIN, UserRole.SUB_ORG_ADMIN, UserRole.MEMBER)
  findOne(@Param('id') id: string) {
    return this.walletService.findOne(+id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN)
  update(@Param('id') id: string, @Body() data: Partial<Wallet>) {
    return this.walletService.update(+id, data);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.walletService.remove(+id);
  }

  @Post(':id/deposit')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN, UserRole.PARTNER_ADMIN, UserRole.SUB_ORG_ADMIN)
  async deposit(
    @Param('id') id: string,
    @Body() dto: DepositDto,
  ) {
    return this.walletService.deposit(+id, dto.amount, dto.description);
  }

  @Post(':id/withdraw')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN)
  async withdraw(
    @Param('id') id: string,
    @Body() dto: WithdrawDto,
  ) {
    return this.walletService.withdraw(+id, dto.amount, dto.description, undefined, dto.code);
  }

  @Post('transfer')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN, UserRole.PARTNER_ADMIN)
  async transfer(
    @Body() dto: TransferDto,
  ) {
    return this.walletService.transfer(
      dto.fromWalletId,
      dto.toWalletId,
      dto.amount,
      dto.type || 'internal_transfer',
      dto.description,
      dto.organisationId || 1,
      undefined,
      dto.code
    );
  }
}
