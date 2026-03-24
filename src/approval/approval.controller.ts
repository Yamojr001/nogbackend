import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApprovalService } from './approval.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Approval } from '../entities/approval.entity';
import { ApprovalEngineService } from './approval-engine.service';
import { UserRole } from '../entities/user.entity';

@Controller('approvals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApprovalController {
  constructor(
    private readonly approvalService: ApprovalService,
    private readonly approvalEngine: ApprovalEngineService,
  ) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN, UserRole.PARTNER_ADMIN, UserRole.SUB_ORG_ADMIN)
  create(@Body() data: Partial<Approval>) {
    return this.approvalService.create(data);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN, UserRole.AUDITOR, UserRole.PARTNER_ADMIN, UserRole.SUB_ORG_ADMIN)
  findAll() {
    return this.approvalService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN, UserRole.AUDITOR, UserRole.PARTNER_ADMIN, UserRole.SUB_ORG_ADMIN)
  findOne(@Param('id') id: string) {
    return this.approvalService.findOne(+id);
  }

  @Post(':id/approve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN, UserRole.PARTNER_ADMIN, UserRole.SUB_ORG_ADMIN)
  async approve(
    @Param('id') id: string,
    @Req() req: any,
    @Body('comments') comments?: string,
  ) {
    const approverId = req.user.userId;
    return this.approvalEngine.advance(+id, approverId, 'approved', comments);
  }

  @Post(':id/reject')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN, UserRole.PARTNER_ADMIN, UserRole.SUB_ORG_ADMIN)
  async reject(
    @Param('id') id: string,
    @Req() req: any,
    @Body('comments') comments?: string,
  ) {
    const approverId = req.user.userId;
    return this.approvalEngine.advance(+id, approverId, 'rejected', comments);
  }

  @Get(':id/logs')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN, UserRole.AUDITOR, UserRole.PARTNER_ADMIN, UserRole.SUB_ORG_ADMIN)
  getLogs(@Param('id') id: string) {
    return this.approvalService.findLogs(+id);
  }
}
