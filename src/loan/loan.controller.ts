import { Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { LoanService } from './loan.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Loan, LoanStatus } from '../entities/loan.entity';
import { UserRole } from '../entities/user.entity';
import { CreateLoanDto, RequestLoanDto } from './dto/loan.dto';

@Controller('loans')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LoanController {
  constructor(private readonly loanService: LoanService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN, UserRole.PARTNER_ADMIN)
  create(@Body() data: CreateLoanDto) {
    return this.loanService.create(data);
  }

  @Post('apply')
  @Roles(UserRole.MEMBER, UserRole.GROUP_ADMIN, UserRole.GROUP_TREASURER, UserRole.SUB_ORG_ADMIN, UserRole.PARTNER_ADMIN, UserRole.SUPER_ADMIN)
  apply(
    @Req() req: any,
    @Body() dto: RequestLoanDto,
  ) {
    return this.loanService.requestLoan(req.user.userId, dto.amount, dto.interestRate, dto.term);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN, UserRole.AUDITOR, UserRole.PARTNER_ADMIN, UserRole.SUB_ORG_ADMIN)
  findAll() {
    return this.loanService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN, UserRole.AUDITOR, UserRole.PARTNER_ADMIN, UserRole.SUB_ORG_ADMIN, UserRole.MEMBER)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.loanService.findOne(id);
  }

  @Post(':id/approve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN, UserRole.PARTNER_ADMIN)
  approveLoan(@Param('id', ParseIntPipe) id: number, @Req() req: any, @Body('comments') comments?: string) {
    return this.loanService.approveLoan(id, req.user.userId, comments);
  }

  @Post(':id/reject')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN, UserRole.PARTNER_ADMIN)
  rejectLoan(@Param('id', ParseIntPipe) id: number, @Req() req: any, @Body('comments') comments?: string) {
    return this.loanService.rejectLoan(id, req.user.userId, comments);
  }
}
