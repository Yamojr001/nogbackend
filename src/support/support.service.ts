import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportTicket, TicketStatus } from '../entities/support-ticket.entity';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../entities/notification.entity';

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(SupportTicket)
    private ticketRepo: Repository<SupportTicket>,
    private notificationService: NotificationService,
  ) {}

  async findAll() {
    return this.ticketRepo.find({
      relations: ['member', 'member.user', 'assignedTo'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number) {
    const ticket = await this.ticketRepo.findOne({
      where: { id },
      relations: ['member', 'member.user', 'assignedTo'],
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async updateStatus(id: number, status: TicketStatus) {
    const ticket = await this.findOne(id);
    ticket.status = status;
    return this.ticketRepo.save(ticket);
  }

  async assignTicket(id: number, adminId: number) {
    const ticket = await this.findOne(id);
    ticket.assignedToId = adminId;
    ticket.status = TicketStatus.IN_PROGRESS;
    return this.ticketRepo.save(ticket);
  }

  async respondToTicket(id: number, response: string) {
    const ticket = await this.findOne(id);
    
    // In a real app, we'd have a TicketResponse entity.
    // For stabilization, we'll simulate by updating description or status and notifying user.
    
    if (ticket.member?.user) {
      await this.notificationService.trigger(
        ticket.member.user.id,
        `Update on your ticket: ${ticket.subject}`,
        `Support has responded: ${response}`,
        [NotificationType.IN_APP, NotificationType.EMAIL]
      );
    }

    ticket.status = TicketStatus.RESOLVED;
    return this.ticketRepo.save(ticket);
  }

  async getStats() {
    const total = await this.ticketRepo.count();
    const open = await this.ticketRepo.count({ where: { status: TicketStatus.OPEN } });
    const inProgress = await this.ticketRepo.count({ where: { status: TicketStatus.IN_PROGRESS } });
    const resolved = await this.ticketRepo.count({ where: { status: TicketStatus.RESOLVED } });

    return { total, open, inProgress, resolved };
  }
}
