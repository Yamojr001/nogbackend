import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { DashboardService } from './dashboard.service';
import { UserRole } from '../entities/user.entity';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRole.SUPER_ADMIN,
  UserRole.FINANCE_ADMIN,
  UserRole.AUDITOR,
  UserRole.PARTNER_ADMIN,
  UserRole.PARTNER_OFFICER,
  UserRole.SUB_ORG_ADMIN,
  UserRole.SUB_ORG_OFFICER,
  UserRole.GROUP_ADMIN,
  UserRole.GROUP_TREASURER,
  UserRole.GROUP_SECRETARY,
)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getStats(@Req() req: any) {
    return this.dashboardService.getStats(req.user);
  }

  @Get('charts')
  async getCharts(@Req() req: any) {
    return this.dashboardService.getCharts(req.user);
  }

  @Get('alerts')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN, UserRole.AUDITOR, UserRole.PARTNER_ADMIN)
  async getAlerts(@Req() req: any) {
    return this.dashboardService.getAlerts(req.user);
  }
}
