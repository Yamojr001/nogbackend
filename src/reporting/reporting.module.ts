import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from '../entities/wallet.entity';
import { Ledger } from '../entities/ledger.entity';
import { Loan } from '../entities/loan.entity';
import { Contribution } from '../entities/contribution.entity';
import { Transaction } from '../entities/transaction.entity';
import { Member } from '../entities/member.entity';
import { Organisation } from '../entities/organisation.entity';
import { ReportingService } from './reporting.service';
import { ReportingController } from './reporting.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Wallet, Ledger, Loan, Contribution, Transaction, Member, Organisation])],
  controllers: [ReportingController],
  providers: [ReportingService],
  exports: [ReportingService],
})
export class ReportingModule {}
