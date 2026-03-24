import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PartnerService } from './partner.service';
import { UserRole } from '../entities/user.entity';

@Controller('partner')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.PARTNER_ADMIN)
export class PartnerController {
  constructor(private readonly partnerService: PartnerService) {}

  @Get(':partnerId/dashboard')
  async getDashboard(@Param('partnerId', ParseIntPipe) partnerId: number) {
    return this.partnerService.getDashboardStats(partnerId);
  }

  @Get(':partnerId/members')
  async getMembers(@Param('partnerId', ParseIntPipe) partnerId: number) {
    return this.partnerService.getMembers(partnerId);
  }

  @Get(':partnerId/finances')
  async getFinances(@Param('partnerId', ParseIntPipe) partnerId: number) {
    return this.partnerService.getFinances(partnerId);
  }

  @Get(':partnerId/approvals')
  async getApprovals(@Param('partnerId', ParseIntPipe) partnerId: number) {
    return this.partnerService.getApprovals(partnerId);
  }
}
