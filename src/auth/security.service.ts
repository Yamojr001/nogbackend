import { Injectable, Logger } from '@nestjs/common';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../entities/notification.entity';
import { Audit } from '../entities/audit.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);

  constructor(
    private readonly notificationService: NotificationService,
    @InjectRepository(Audit)
    private readonly auditRepository: Repository<Audit>,
  ) {}

  async detectNewLogin(userId: number, ipAddress: string, userAgent: string) {
    // 1. Check if this IP/UA has logged in before for this user
    const previous = await this.auditRepository.findOne({
      where: { userId, action: 'USER_LOGIN' },
      order: { createdAt: 'DESC' }
    });

    // Device detection via metadata
    const prevUserAgent = previous?.metadata?.userAgent;
    const isNew = previous && (previous.ipAddress !== ipAddress || prevUserAgent !== userAgent);

    if (isNew) {
      await this.notificationService.trigger(
        userId,
        'Security Alert: New Login',
        `A new login was detected on your account from ${userAgent} at IP ${ipAddress}. If this wasn't you, reset your password.`,
        [NotificationType.EMAIL, NotificationType.PUSH]
      );
    }
  }

  async alertLargeTransaction(userId: number, amount: number, currency: string) {
    const THRESHOLD = 500000; // 500k NGN
    if (amount >= THRESHOLD) {
      await this.notificationService.trigger(
        userId,
        'Critical Transaction Alert',
        `A large transaction of ${currency} ${amount.toLocaleString()} was initiated. Please confirm via OTP if required.`,
        [NotificationType.SMS, NotificationType.PUSH, NotificationType.EMAIL]
      );

      await this.auditRepository.save(
        this.auditRepository.create({
          userId,
          action: 'LARGE_TRANSACTION_ALERT',
          entityType: 'Transaction',
          details: `Large transaction of ${amount} ${currency} detected.`,
          metadata: { amount, currency },
        }),
      );
    }
  }
}
