import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from '../entities/notification.entity';
import { OtpCode } from '../entities/otp-code.entity';
import { SmsLog } from '../entities/sms-log.entity';
import { User } from '../entities/user.entity';
import { NotificationService } from './notification.service';
import { OtpService } from './otp.service';
import { SmsService } from './channels/sms.service';
import { PushService } from './channels/push.service';
import { NotificationController } from './notification.controller';
import { EmailModule } from '../email/email.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, OtpCode, SmsLog, User]),
    EmailModule,
  ],
  providers: [
    NotificationService,
    OtpService,
    SmsService,
    PushService,
  ],
  controllers: [NotificationController],
  exports: [NotificationService, OtpService, SmsService, PushService],
})
export class NotificationModule {}
