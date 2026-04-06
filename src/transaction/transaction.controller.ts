import { Controller, Get, Param, ParseIntPipe, Query, UseGuards, Req, ForbiddenException } from '@nestjs/common';
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
  @Roles(
    UserRole.SUPER_ADMIN, 
    UserRole.FINANCE_ADMIN, 
    UserRole.AUDITOR, 
    UserRole.PARTNER_ADMIN, 
    UserRole.SUB_ORG_ADMIN,
    UserRole.MEMBER
  )
  async findAll(@Query() query: any, @Req() req: any) {
    const user = req.user;
    const filters: any = { ...query };

    // If member, strictly enforce filtering by their own memberId
    if (user.role === UserRole.MEMBER) {
      // We need to find the memberId for this user
      const userId = user.sub || (user as any).userId || (user as any).id;
      const member = await this.service['repo'].manager.findOne('Member', { where: { userId } }) as any;
      if (member) {
        filters.memberId = member.id;
      } else {
        return []; // No member profile, no transactions
      }
    }

    return this.service.findAll(filters);
  }

  @Get('summary')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN, UserRole.AUDITOR)
  getSummary() {
    return this.service.getSummary();
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN, UserRole.AUDITOR, UserRole.PARTNER_ADMIN, UserRole.MEMBER)
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const transaction = await this.service.findOne(id);
    const user = req.user;

    // RBAC: Members can only see their own transactions
    if (user.role === UserRole.MEMBER) {
      const userId = user.sub || (user as any).userId || (user as any).id;
      const member = await this.service['repo'].manager.findOne('Member', { where: { userId } }) as any;
      if (!transaction || (member && transaction.memberId !== member.id)) {
        throw new ForbiddenException('You do not have permission to view this transaction');
      }
    }

    return transaction;
  }

  @Get('ref/:reference')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN, UserRole.AUDITOR, UserRole.MEMBER)
  async findByRef(@Param('reference') ref: string, @Req() req: any) {
    const transaction = await this.service.findByReference(ref);
    const user = req.user;

    if (user.role === UserRole.MEMBER) {
      const userId = user.sub || (user as any).userId || (user as any).id;
      const member = await this.service['repo'].manager.findOne('Member', { where: { userId } }) as any;
      if (!transaction || (member && transaction.memberId !== member.id)) {
        throw new ForbiddenException('You do not have permission to view this transaction');
      }
    }

    return transaction;
  }
}
