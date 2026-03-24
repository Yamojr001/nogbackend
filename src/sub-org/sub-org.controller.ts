import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { SubOrgService } from './sub-org.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('sub-org')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUB_ORG_ADMIN, UserRole.SUB_ORG_OFFICER, UserRole.PARTNER_ADMIN, UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN, UserRole.AUDITOR)
export class SubOrgController {
  constructor(private subOrgService: SubOrgService) {}

  @Get(':branchId/dashboard')
  async getDashboard(@Param('branchId', ParseIntPipe) branchId: number) {
    return this.subOrgService.getDashboardStats(branchId);
  }

  @Get(':branchId/members')
  async getMembers(@Param('branchId', ParseIntPipe) branchId: number) {
    return this.subOrgService.getMembers(branchId);
  }

  @Get(':branchId/finances')
  async getFinances(@Param('branchId', ParseIntPipe) branchId: number) {
    return this.subOrgService.getFinances(branchId);
  }
}
