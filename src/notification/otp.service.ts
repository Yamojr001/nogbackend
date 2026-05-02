import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { OtpCode, OtpPurpose, OtpStatus } from '../entities/otp-code.entity';
import { User } from '../entities/user.entity';
import { NotificationService } from './notification.service';
import { NotificationType } from '../entities/notification.entity';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    @InjectRepository(OtpCode)
    private otpRepository: Repository<OtpCode>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private notificationService: NotificationService,
  ) {}

  async generateOtp(userId: number, purpose: OtpPurpose): Promise<string> {
    // 1. Invalidate previous PENDING OTPs for this user & purpose
    await this.otpRepository.update(
      { userId, purpose, status: OtpStatus.PENDING },
      { status: OtpStatus.INVALIDATED }
    );

    // 2. Generate 6-digit numeric code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 3. Set expiry (5 minutes)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    const otp = this.otpRepository.create({
      userId,
      code,
      purpose,
      expiresAt,
      status: OtpStatus.PENDING,
      attempts: 0,
    });

    await this.otpRepository.save(otp);
    this.logger.log(`Generated OTP for user ${userId} [${purpose}]: ${code}`);

    // Send OTP via NotificationService (respects user preferences). Do not block on failures.
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      const phone = (user as any)?.phone || (user as any)?.phoneNumber;
      if (phone) {
        const message = `Your verification code is ${code}. It expires in 5 minutes.`;
        await this.notificationService.trigger(userId, 'Verification Code', message, [NotificationType.SMS]).catch(e => this.logger.error('Notification trigger failed', e));
        this.logger.log(`Triggered OTP notification for user ${userId}`);
      } else {
        this.logger.warn(`No phone number for user ${userId}; skipping SMS notify.`);
      }
    } catch (err) {
      this.logger.error('Failed to trigger OTP notification', err as any);
    }

    return code;
  }

  async verifyOtp(userId: number, purpose: OtpPurpose, code: string): Promise<{ success: boolean; message: string }> {
    const otp = await this.otpRepository.findOne({
      where: { 
        userId, 
        purpose, 
        status: OtpStatus.PENDING,
        expiresAt: MoreThan(new Date())
      },
      order: { createdAt: 'DESC' }
    });

    if (!otp) {
      return { success: false, message: 'OTP expired or not found.' };
    }

    if (otp.attempts >= 3) {
      otp.status = OtpStatus.INVALIDATED;
      await this.otpRepository.save(otp);
      return { success: false, message: 'Maximum attempts exceeded. Please request a new OTP.' };
    }

    if (otp.code !== code) {
      otp.attempts += 1;
      await this.otpRepository.save(otp);
      return { success: false, message: 'Invalid OTP code.' };
    }

    otp.status = OtpStatus.VERIFIED;
    await this.otpRepository.save(otp);
    return { success: true, message: 'OTP verified successfully.' };
  }
}
