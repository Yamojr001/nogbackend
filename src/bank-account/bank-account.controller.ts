import { Controller, Get, Post, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BankAccountService } from './bank-account.service';

@Controller('bank-accounts')
@UseGuards(JwtAuthGuard)
export class BankAccountController {
  constructor(private readonly bankAccountService: BankAccountService) {}

  @Post()
  async addAccount(@Req() req: any, @Body() dto: any) {
    return this.bankAccountService.addMemberBankAccount(req.user.userId || req.user.id, dto);
  }

  @Get()
  async getMyAccounts(@Req() req: any) {
    return this.bankAccountService.getMemberBankAccounts(req.user.userId || req.user.id);
  }

  @Delete(':id')
  async removeAccount(@Req() req: any, @Param('id') id: number) {
    return this.bankAccountService.removeMemberBankAccount(req.user.userId || req.user.id, id);
  }
}
