import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType, NotificationStatus } from '../entities/notification.entity';
import { EmailService } from '../email/email.service';
import { SmsService } from './channels/sms.service';
import { PushService } from './channels/push.service';
import { User } from '../entities/user.entity';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private emailService: EmailService,
    private smsService: SmsService,
    private pushService: PushService,
  ) {}

  /**
   * Central Trigger: Fires a notification across multiple channels based on priority or preferences.
   */
  async trigger(userId: number, title: string, message: string, channels: NotificationType[] = [NotificationType.IN_APP]) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) return;

    // Use default settings if user preferences aren't set
    const settings = user.notificationSettings || { email: true, sms: true, push: true };

    for (const channel of channels) {
      // Respect user settings for external channels
      if (channel === NotificationType.EMAIL && !settings.email) continue;
      if (channel === NotificationType.SMS && !settings.sms) continue;
      if (channel === NotificationType.PUSH && !settings.push) continue;

      const notification = this.notificationRepository.create({
        userId,
        title,
        message,
        type: channel,
        status: NotificationStatus.PENDING,
      });
      await this.notificationRepository.save(notification);

      try {
        let success = false;
        switch (channel) {
          case NotificationType.EMAIL:
            await this.emailService.queueEmail(user.email, 'notification', title, 'notification', { name: user.firstName, title, message });
            success = true; // Queued is counted as success for this service
            break;
          case NotificationType.SMS:
            if (user.phone) {
              success = await this.smsService.sendSms(user.phone, `${title}: ${message}`);
            }
            break;
          case NotificationType.PUSH:
            success = await this.pushService.sendPush(userId, title, message);
            break;
          case NotificationType.IN_APP:
            success = true; // Stored in DB is enough
            break;
        }

        notification.status = success ? NotificationStatus.SENT : NotificationStatus.FAILED;
        notification.sentAt = new Date();
        await this.notificationRepository.save(notification);
      } catch (err) {
        this.logger.error(`Failed to trigger notification for channel ${channel}: ${err.message}`);
        notification.status = NotificationStatus.FAILED;
        await this.notificationRepository.save(notification);
      }
    }
  }

  async getByUser(userId: number) {
    return this.notificationRepository.find({
      where: { userId, type: NotificationType.IN_APP },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async markAsRead(notificationId: number) {
    await this.notificationRepository.update(notificationId, { isRead: true });
    return this.notificationRepository.findOne({ where: { id: notificationId } });
  }

  async getUnreadCount(userId: number): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, type: NotificationType.IN_APP, isRead: false },
    });
  }
}
