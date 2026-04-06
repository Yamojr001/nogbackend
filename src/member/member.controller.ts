import { Controller, Get, Post, Body, UseGuards, Req, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { RegistrationFeeGuard } from '../auth/registration-fee.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { MemberService } from './member.service';

@Controller('member')
@UseGuards(JwtAuthGuard, RolesGuard, RegistrationFeeGuard)
@Roles(UserRole.MEMBER, UserRole.GROUP_ADMIN, UserRole.GROUP_TREASURER, UserRole.GROUP_SECRETARY)
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  @Get('dashboard')
  async getDashboard(@Req() req: any) {
    return this.memberService.getDashboardStats(req.user.userId);
  }

  @Get('profile')
  async getProfile(@Req() req: any) {
    return this.memberService.getProfile(req.user.userId);
  }

  @Get('savings')
  async getSavings(@Req() req: any) {
    return this.memberService.getSavingsHistory(req.user.userId);
  }

  @Get('loans')
  async getLoans(@Req() req: any) {
    return this.memberService.getLoans(req.user.userId);
  }

  @Get('wallet')
  async getWallet(@Req() req: any) {
    return this.memberService.getWallet(req.user.userId);
  }

  @Get('transactions')
  async getTransactions(@Req() req: any, @Query() query: any) {
    return this.memberService.getTransactions(req.user.userId, query);
  }

  @Get('notifications')
  async getNotifications(@Req() req: any) {
    return this.memberService.getNotifications(req.user.userId);
  }

  @Post('support')
  async createTicket(@Req() req: any, @Body() payload: any) {
    return this.memberService.createSupportTicket(req.user.userId, payload);
  }

  @Get('support')
  async getMyTickets(@Req() req: any) {
    return this.memberService.getMyTickets(req.user.userId);
  }
}
