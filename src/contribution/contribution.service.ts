import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contribution } from '../entities/contribution.entity';
import { CreateContributionDto } from './dto/contribution.dto';
import { EmailService } from '../email/email.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../entities/notification.entity';

@Injectable()
export class ContributionService {
  constructor(
    @InjectRepository(Contribution)
    private repo: Repository<Contribution>,
    private emailService: EmailService,
    private notificationService: NotificationService,
  ) {}

  async findAll() {
    return this.repo.find({
      relations: ['member', 'member.user', 'group', 'branch'],
      order: { date: 'DESC' },
    });
  }

  async findByMember(memberId: number) {
    return this.repo.find({
      where: { memberId },
      order: { date: 'DESC' },
    });
  }

  async create(data: CreateContributionDto) {
    const c = this.repo.create(data);
    const saved = await this.repo.save(c);
    
    // â”€â”€â”€ Trigger Receipts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    try {
      const full = await this.repo.findOne({ 
        where: { id: saved.id }, 
        relations: ['member', 'member.user', 'group'] 
      });
      if (full?.member?.user) {
        await this.notificationService.trigger(
          full.member.user.id,
          'Contribution Recorded - Coop-OS',
          `Your contribution of NGN ${full.amount} to ${full.group?.name || 'Group'} has been received.`,
          [NotificationType.EMAIL, NotificationType.SMS, NotificationType.PUSH, NotificationType.IN_APP]
        );
      }
    } catch (err) {
      console.error('Failed to trigger contribution receipts:', err.message);
    }

    return saved;
  }

  async getSummary() {
    const all = await this.repo.find();
    const total = all.reduce((s, c) => s + Number(c.amount || 0), 0);
    const completed = all.filter(c => c.status === 'completed').length;
    return { total, count: all.length, completed };
  }
}
