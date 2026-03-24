import { Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { ContributionService } from './contribution.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { CreateContributionDto } from './dto/contribution.dto';

@Controller('contributions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContributionController {
  constructor(private readonly service: ContributionService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN, UserRole.AUDITOR, UserRole.PARTNER_ADMIN, UserRole.SUB_ORG_ADMIN)
  findAll() {
    return this.service.findAll();
  }

  @Get('summary')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN, UserRole.AUDITOR)
  getSummary() {
    return this.service.getSummary();
  }

  @Get('member/:memberId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN, UserRole.PARTNER_ADMIN, UserRole.SUB_ORG_ADMIN, UserRole.GROUP_ADMIN, UserRole.GROUP_TREASURER, UserRole.MEMBER)
  findByMember(@Param('memberId', ParseIntPipe) memberId: number) {
    return this.service.findByMember(memberId);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN, UserRole.GROUP_TREASURER, UserRole.SUB_ORG_ADMIN)
  create(@Body() body: CreateContributionDto) {
    return this.service.create(body);
  }
}
