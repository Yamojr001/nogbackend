import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Approval } from '../entities/approval.entity';
import { ApprovalService } from './approval.service';
import { ApprovalController } from './approval.controller';
import { ApprovalEngineService } from './approval-engine.service';
import { LoanModule } from '../loan/loan.module';
import { NotificationModule } from '../notification/notification.module';
import { MemberModule } from '../member/member.module';
import { OrganisationModule } from '../organisation/organisation.module';
import { PaystackModule } from '../paystack/paystack.module';
import { ApprovalLog } from '../entities/approval-log.entity';
import { ApprovalWorkflowConfig } from '../entities/approval-workflow-config.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Approval, ApprovalLog, ApprovalWorkflowConfig]),
    forwardRef(() => LoanModule),
    forwardRef(() => MemberModule),
    OrganisationModule,
    NotificationModule,
    PaystackModule,
  ],
  providers: [ApprovalService, ApprovalEngineService],
  controllers: [ApprovalController],
  exports: [ApprovalService, ApprovalEngineService],
})
export class ApprovalModule {}
