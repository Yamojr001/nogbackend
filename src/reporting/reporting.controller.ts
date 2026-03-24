import { Controller, Get, Res, UseGuards, Param } from '@nestjs/common';
import { Response } from 'express';
import { ReportingService } from './reporting.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.PARTNER_ADMIN)
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('transactions/export')
  async exportTransactions(@Res() res: Response) {
    const csv = await this.reportingService.exportTransactionsCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
    return res.send(csv);
  }

  @Get('transactions/export/pdf')
  async exportTransactionsPdf(@Res() res: Response) {
    const buffer = await this.reportingService.exportTransactionsPdf();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=transactions_report.pdf');
    return res.send(buffer);
  }

  @Get('transactions/:id/receipt')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PARTNER_ADMIN, UserRole.SUB_ORG_ADMIN, UserRole.MEMBER)
  async getReceipt(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.reportingService.generateTransactionReceipt(+id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt_${id}.pdf`);
    return res.send(buffer);
  }

  @Get('members/export')
  async exportMembers(@Res() res: Response) {
    const csv = await this.reportingService.exportMembersCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=members.csv');
    return res.send(csv);
  }

  @Get('financial-performance')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN)
  async getFinancialPerformance() {
    return this.reportingService.getFinancialPerformance();
  }

  @Get('demographics')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PARTNER_ADMIN, UserRole.SUB_ORG_ADMIN, UserRole.MEMBER)
  async getDemographics() {
    return this.reportingService.getDemographics();
  }
}
