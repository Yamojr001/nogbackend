import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EmailLog, EmailStatus } from '../entities/email-log.entity';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly mailerService: MailerService,
    @InjectRepository(EmailLog)
    private readonly emailLogRepository: Repository<EmailLog>,
  ) {}

  /**
   * Queues an email by saving it to the database.
   * A background worker will process these.
   */
  async queueEmail(to: string, type: string, subject: string, template: string, context: any) {
    const log = this.emailLogRepository.create({
      recipientEmail: to,
      emailType: type,
      subject,
      context,
      status: EmailStatus.PENDING,
    });
    return await this.emailLogRepository.save(log);
  }

  /**
   * Sends an email immediately (can be used by the worker).
   */
  async sendEmail(logId: number) {
    const log = await this.emailLogRepository.findOne({ where: { id: logId } });
    if (!log) return;

    try {
      log.attempts += 1;
      await this.mailerService.sendMail({
        to: log.recipientEmail,
        subject: log.subject,
        template: `./${log.emailType}`, // Template name matches emailType
        context: log.context,
      });

      log.status = EmailStatus.SENT;
      log.sentAt = new Date();
      log.errorMessage = null;
    } catch (error) {
      this.logger.error(`Failed to send email ${logId}: ${error.message}`);
      log.status = EmailStatus.FAILED;
      log.errorMessage = error.message;
    }

    await this.emailLogRepository.save(log);
  }

  /**
   * Process pending emails (Simple background worker simulation)
   */
  @Cron('*/30 * * * * *')
  async processQueue() {
    const pending = await this.emailLogRepository.find({
      where: { status: EmailStatus.PENDING },
      take: 10,
    });

    for (const log of pending) {
      await this.sendEmail(log.id);
    }
  }
}
