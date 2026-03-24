import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailLog, EmailStatus } from '../entities/email-log.entity';
import { EmailService } from './email.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('email')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class EmailController {
  constructor(
    @InjectRepository(EmailLog)
    private readonly emailLogRepository: Repository<EmailLog>,
    private readonly emailService: EmailService,
  ) {}

  @Get('logs')
  async getLogs() {
    return await this.emailLogRepository.find({
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  @Post('retry/:id')
  async retryEmail(@Param('id') id: number) {
    const log = await this.emailLogRepository.findOne({ where: { id } });
    if (log) {
      log.status = EmailStatus.PENDING;
      log.attempts = 0;
      await this.emailLogRepository.save(log);
      return { message: 'Email queued for retry' };
    }
  }

  @Get('stats')
  async getStats() {
    const total = await this.emailLogRepository.count();
    const sent = await this.emailLogRepository.count({ where: { status: EmailStatus.SENT } });
    const pending = await this.emailLogRepository.count({ where: { status: EmailStatus.PENDING } });
    const failed = await this.emailLogRepository.count({ where: { status: EmailStatus.FAILED } });
    
    return { total, sent, pending, failed };
  }
}
