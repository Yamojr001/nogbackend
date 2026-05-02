import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Transaction } from '../entities/transaction.entity';
import { Member } from '../entities/member.entity';
import { Wallet } from '../entities/wallet.entity';
import { Audit } from '../entities/audit.entity';
import { BvnVerification } from '../entities/bvn-verification.entity';
import { VirtualAccount } from '../entities/virtual-account.entity';
import { Organisation } from '../entities/organisation.entity';
import { NotificationModule } from '../notification/notification.module';
import { ParallexConfigService } from './parallex-config.service';
import { ParallexPaymentService } from './parallex-payment.service';
import { ParallexBvnService } from './parallex-bvn.service';
import { ParallexPaymentController } from './parallex-payment.controller';
import { ParallexBvnController } from './parallex-bvn.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Transaction, Member, Wallet, Audit, BvnVerification, VirtualAccount, Organisation]),
    NotificationModule,
  ],
  providers: [ParallexConfigService, ParallexPaymentService, ParallexBvnService],
  controllers: [ParallexPaymentController, ParallexBvnController],
  exports: [ParallexPaymentService, ParallexBvnService, ParallexConfigService],
})
export class ParallexModule {}
