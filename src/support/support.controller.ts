import { Controller, Get, Post, Body, Param, Patch, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { TicketStatus } from '../entities/support-ticket.entity';

@Controller('admin/support')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.SUPPORT_AGENT)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get('tickets')
  async getAllTickets() {
    return this.supportService.findAll();
  }

  @Get('stats')
  async getStats() {
    return this.supportService.getStats();
  }

  @Get('tickets/:id')
  async getTicket(@Param('id', ParseIntPipe) id: number) {
    return this.supportService.findOne(id);
  }

  @Patch('tickets/:id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: TicketStatus
  ) {
    return this.supportService.updateStatus(id, status);
  }

  @Post('tickets/:id/assign')
  async assignTicket(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any
  ) {
    return this.supportService.assignTicket(id, req.user.userId);
  }

  @Post('tickets/:id/respond')
  async respond(
    @Param('id', ParseIntPipe) id: number,
    @Body('response') response: string
  ) {
    return this.supportService.respondToTicket(id, response);
  }
}
