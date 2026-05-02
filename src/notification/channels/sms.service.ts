import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SmsLog, SmsStatus } from '../../entities/sms-log.entity';
import { SmsService as ProviderSmsService } from '../../services/sms.service';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private provider: ProviderSmsService;

  constructor(
    @InjectRepository(SmsLog)
    private smsLogRepository: Repository<SmsLog>,
  ) {
    // Instantiate provider-backed SMS service (reads from env by default)
    try {
      this.provider = new ProviderSmsService();
    } catch (err) {
      this.logger.warn('Failed to initialize provider SMS service, falling back to logger-only mode');
      this.provider = undefined as any;
    }
  }

  async sendSms(phoneNumber: string, message: string): Promise<boolean> {
    const log = this.smsLogRepository.create({
      phoneNumber,
      message,
      status: SmsStatus.PENDING,
      provider: process.env.SMS_PROVIDER || 'placeholder',
    });

    await this.smsLogRepository.save(log);

    try {
      this.logger.log(`[SMS SEND] To: ${phoneNumber} Message: ${message}`);

      let providerResponse: any = null;
      if (this.provider) {
        providerResponse = await this.provider.sendSMS(phoneNumber, message, {
          method: 'GET',
        });
      } else {
        providerResponse = { simulated: true };
      }

      log.status = SmsStatus.SENT;
      log.sentAt = new Date();
      try {
        log.providerResponse = typeof providerResponse === 'string' ? providerResponse : JSON.stringify(providerResponse);
      } catch (e) {
        log.providerResponse = String(providerResponse);
      }
      await this.smsLogRepository.save(log);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${phoneNumber}: ${error.message}`);
      log.status = SmsStatus.FAILED;
      log.providerResponse = error.message;
      await this.smsLogRepository.save(log);
      return false;
    }
  }
}
