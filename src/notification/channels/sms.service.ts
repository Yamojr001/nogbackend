import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SmsLog, SmsStatus } from '../../entities/sms-log.entity';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    @InjectRepository(SmsLog)
    private smsLogRepository: Repository<SmsLog>,
  ) {}

  async sendSms(phoneNumber: string, message: string): Promise<boolean> {
    const log = this.smsLogRepository.create({
      phoneNumber,
      message,
      status: SmsStatus.PENDING,
      provider: 'Placeholder (Termii/Twilio/AfricaTalking)',
    });
    
    await this.smsLogRepository.save(log);

    try {
      this.logger.log(`[SMS SEND] To: ${phoneNumber} Message: ${message}`);
      // Simulate external API call
      // const response = await axios.post(...)
      
      log.status = SmsStatus.SENT;
      log.sentAt = new Date();
      log.providerResponse = 'OK - Simulated';
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
