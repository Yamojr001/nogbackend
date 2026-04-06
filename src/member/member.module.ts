import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MemberService } from './member.service';
import { MemberController } from './member.controller';
import { Member } from '../entities/member.entity';
import { Transaction } from '../entities/transaction.entity';
import { Loan } from '../entities/loan.entity';
import { SupportTicket } from '../entities/support-ticket.entity';
import { Beneficiary } from '../entities/beneficiary.entity';
import { User } from '../entities/user.entity';
import { RegistrationFeeGuard } from '../auth/registration-fee.guard';

import { RepaymentSchedule } from '../entities/repayment-schedule.entity';
import { ProgramApplication } from '../entities/program-application.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Member, Transaction, Loan, SupportTicket, Beneficiary, User, RepaymentSchedule, ProgramApplication]),
  ],
  providers: [MemberService, RegistrationFeeGuard],
  controllers: [MemberController],
  exports: [MemberService],
})
export class MemberModule {}
