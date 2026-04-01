import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { VirtualAccount } from '../entities/virtual-account.entity';
import { User } from '../entities/user.entity';
import { Wallet } from '../entities/wallet.entity';
import { SystemConfig } from '../entities/system-config.entity';
import { Transaction } from '../entities/transaction.entity';
import { Ledger } from '../entities/ledger.entity';
import { Audit } from '../entities/audit.entity';
import { Notification } from '../entities/notification.entity';

import { PaystackConfigService } from './paystack-config.service';
import { VirtualAccountService } from './virtual-account.service';
import { PaymentService } from './payment.service';
import { PaystackWebhookController } from './paystack-webhook.controller';
import { VirtualAccountController, PaymentSettingsController } from './virtual-account.controller';
import { EmailModule } from '../email/email.module';
import { Member } from '../entities/member.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VirtualAccount,
      User,
      Wallet,
      SystemConfig,
      Transaction,
      Ledger,
      Audit,
      Notification,
      Member,
    ]),
    EmailModule,
  ],
  providers: [
    PaystackConfigService,
    VirtualAccountService,
    PaymentService,
  ],
  controllers: [
    PaystackWebhookController,
    VirtualAccountController,
    PaymentSettingsController,
  ],
  exports: [
    PaystackConfigService,
    VirtualAccountService,
    PaymentService,
  ],
})
export class PaystackModule {}
