import { Controller, Get, Param, UseGuards, Patch, Body, Post } from '@nestjs/common';
import { GroupService } from './group.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { ResourceOwnershipGuard } from '../auth/resource-ownership.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { GroupSyncDto, MarkAttendanceDto } from './dto/group.dto';

@Controller('group')
@UseGuards(JwtAuthGuard, RolesGuard, ResourceOwnershipGuard)
@Roles(UserRole.GROUP_ADMIN, UserRole.GROUP_TREASURER, UserRole.GROUP_SECRETARY, UserRole.SUB_ORG_ADMIN, UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN, UserRole.AUDITOR)
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN, UserRole.AUDITOR)
  async findAll() {
    return this.groupService.findAll();
  }

  @Get('dashboard/:id')
  async getStats(@Param('id') id: number) {
    return this.groupService.getDashboardStats(id);
  }

  @Get('members/:id')
  async getMembers(@Param('id') id: number) {
    return this.groupService.getMembers(id);
  }

  @Roles(UserRole.GROUP_ADMIN, UserRole.SUB_ORG_ADMIN, UserRole.SUPER_ADMIN)
  @Patch('members/:id/role')
  async updateRole(@Param('id') userId: number, @Body('role') role: UserRole) {
    return this.groupService.updateMemberRole(userId, role);
  }

  @Get('finances/:id')
  async getFinances(@Param('id') id: number) {
    return this.groupService.getGroupFinances(id);
  }

  @Get('loans/:id')
  async getLoans(@Param('id') id: number) {
    return this.groupService.getGroupLoans(id);
  }

  @Roles(UserRole.GROUP_TREASURER, UserRole.GROUP_ADMIN, UserRole.SUB_ORG_ADMIN)
  @Post('sync/:id')
  async sync(@Param('id') groupId: number, @Body() payload: GroupSyncDto) {
    return this.groupService.syncData(groupId, payload);
  }

  @Roles(UserRole.GROUP_SECRETARY, UserRole.GROUP_ADMIN, UserRole.SUB_ORG_ADMIN)
  @Post('members/:id/attendance')
  async markAttendance(@Param('id') memberId: number, @Body() dto: MarkAttendanceDto) {
    return this.groupService.markAttendance(memberId, new Date(dto.date), dto.status);
  }
}
