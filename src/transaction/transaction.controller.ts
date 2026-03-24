import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TransactionController {
  constructor(private readonly service: TransactionService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN, UserRole.AUDITOR, UserRole.PARTNER_ADMIN, UserRole.SUB_ORG_ADMIN)
  findAll(@Query('organisationId') orgId?: string) {
    return this.service.findAll(orgId ? +orgId : undefined);
  }

  @Get('summary')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN, UserRole.AUDITOR)
  getSummary() {
    return this.service.getSummary();
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN, UserRole.AUDITOR, UserRole.PARTNER_ADMIN)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Get('ref/:reference')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN, UserRole.AUDITOR)
  findByRef(@Param('reference') ref: string) {
    return this.service.findByReference(ref);
  }
}
