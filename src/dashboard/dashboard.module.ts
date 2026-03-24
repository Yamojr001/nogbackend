import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { CustodialAccount } from '../entities/custodial-account.entity';
import { Organisation } from '../entities/organisation.entity';
import { Member } from '../entities/member.entity';
import { Approval } from '../entities/approval.entity';
import { Transaction } from '../entities/transaction.entity';
import { SystemAlert } from '../entities/system-alert.entity';
import { Wallet } from '../entities/wallet.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustodialAccount, Organisation, Member, Approval, Transaction, SystemAlert, Wallet
    ])
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService]
})
export class DashboardModule {}
