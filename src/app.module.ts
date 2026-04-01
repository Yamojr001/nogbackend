import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';
import { UserModule } from './user/user.module';
import { OrganisationModule } from './organisation/organisation.module';
import { WalletModule } from './wallet/wallet.module';
import { LedgerModule } from './ledger/ledger.module';
import { LoanModule } from './loan/loan.module';
import { ApprovalModule } from './approval/approval.module';
import { AuditModule } from './audit/audit.module';
import { NotificationModule } from './notification/notification.module';
import { ReportingModule } from './reporting/reporting.module';
import { SystemConfigModule } from './system-config/system-config.module';
import { ContributionModule } from './contribution/contribution.module';
import { TransactionModule } from './transaction/transaction.module';
import { Organisation } from './entities/organisation.entity';
import { User } from './entities/user.entity';
import { Wallet } from './entities/wallet.entity';
import { Ledger } from './entities/ledger.entity';
import { Loan } from './entities/loan.entity';
import { Approval } from './entities/approval.entity';
import { Audit } from './entities/audit.entity';
import { Notification } from './entities/notification.entity';
import { Group } from './entities/group.entity';
import { Member } from './entities/member.entity';
import { LoanRepayment } from './entities/loan-repayment.entity';
import { ApprovalLog } from './entities/approval-log.entity';
import { Contribution } from './entities/contribution.entity';
import { SystemConfig } from './entities/system-config.entity';
import { Branch } from './entities/branch.entity';
import { Product } from './entities/product.entity';
import { KycDocument } from './entities/kyc-document.entity';
import { Transaction } from './entities/transaction.entity';
import { ContributionPeriod } from './entities/contribution-period.entity';
import { RepaymentSchedule } from './entities/repayment-schedule.entity';
import { ProductSubscription } from './entities/product-subscription.entity';
import { AdminSession } from './entities/admin-session.entity';
import { ApprovalWorkflowConfig } from './entities/approval-workflow-config.entity';
import { CustodialAccount } from './entities/custodial-account.entity';
import { SettlementBatch } from './entities/settlement-batch.entity';
import { ReportExport } from './entities/report-export.entity';
import { RolePermission } from './entities/role-permission.entity';
import { SystemAlert } from './entities/system-alert.entity';
import { SubOrgModule } from './sub-org/sub-org.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PartnerModule } from './partner/partner.module';
import { GroupModule } from './group/group.module';
import { MemberModule } from './member/member.module';
import { Collection } from './entities/collection.entity';
import { BranchTarget } from './entities/branch-target.entity';
import { BranchExpense } from './entities/branch-expense.entity';
import { Attendance } from './entities/attendance.entity';
import { Meeting } from './entities/meeting.entity';
import { SupportTicket } from './entities/support-ticket.entity';
import { Guarantor } from './entities/guarantor.entity';
import { Beneficiary } from './entities/beneficiary.entity';
import { EmailLog } from './entities/email-log.entity';
import { OtpCode } from './entities/otp-code.entity';
import { SmsLog } from './entities/sms-log.entity';
import { UserTour } from './entities/user-tour.entity';
import { UserTourModule } from './user-tour/user-tour.module';
import { CommonModule } from './common/common.module';
import { BankAccount } from './entities/bank-account.entity';
import { NextOfKin } from './entities/next-of-kin.entity';
import { EmpowermentProgram } from './entities/empowerment-program.entity';
import { ProgramApplication } from './entities/program-application.entity';
import { EmpowermentModule } from './empowerment/empowerment.module';
import { PaystackModule } from './paystack/paystack.module';
import { VirtualAccount } from './entities/virtual-account.entity';
import { SupportModule } from './support/support.module';
import { BanksModule } from './banks/banks.module';
import { Bank } from './entities/bank.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const syncRaw = config.get<string>('DB_SYNCHRONIZE', 'false');
        const synchronize = syncRaw === 'true';

        return {
          type: 'postgres',
          host: config.get<string>('DB_HOST', 'localhost'),
          port: +config.get<number>('DB_PORT', 5432),
          username: config.get<string>('DB_USER', 'postgres'),
          password: config.get<string>('DB_PASS', 'postgres'),
          database: config.get<string>('DB_NAME', 'postgres'),
          url: config.get<string>('DATABASE_URL'), // Support full connection string
          entities: [
            User, Organisation, Wallet, Ledger,
            Loan, Approval, Audit, Notification,
            Group, Member, LoanRepayment, ApprovalLog,
            Contribution, SystemConfig,
            Branch, Product, KycDocument, Transaction,
            ContributionPeriod, RepaymentSchedule, ProductSubscription,
            AdminSession, ApprovalWorkflowConfig, CustodialAccount,
            SettlementBatch, ReportExport, RolePermission, SystemAlert,
            Collection, BranchTarget, BranchExpense,
            Attendance, Meeting, SupportTicket, Guarantor, Beneficiary, EmailLog, OtpCode, SmsLog, UserTour,
            BankAccount, NextOfKin, EmpowermentProgram, ProgramApplication,
            VirtualAccount, Bank
          ],
          synchronize,
          ssl: config.get<string>('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
          extra: {
            connectTimeoutMS: 60000,
          },
        };
      },
    }),
    AuthModule,
    UserModule,
    OrganisationModule,
    WalletModule,
    LedgerModule,
    LoanModule,
    ApprovalModule,
    AuditModule,
    NotificationModule,
    ReportingModule,
    SystemConfigModule,
    SubOrgModule,
    DashboardModule,
    PartnerModule,
    GroupModule,
    MemberModule,
    ContributionModule,
    TransactionModule,
    EmailModule,
    UserTourModule,
    CommonModule,
    EmpowermentModule,
    PaystackModule,
    SupportModule,
    BanksModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
