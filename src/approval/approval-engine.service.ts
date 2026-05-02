import { Injectable, Logger, Inject, forwardRef, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { ApprovalService } from './approval.service';
import { LoanService } from '../loan/loan.service';
import { ApprovalStatus, ApprovalType } from '../entities/approval.entity';
import { LoanStatus } from '../entities/loan.entity';
import { NotificationService } from '../notification/notification.service';
import { MemberService } from '../member/member.service';
import { OrganisationService } from '../organisation/organisation.service';
import { NotificationType } from '../entities/notification.entity';
import { UserRole } from '../entities/user.entity';
import { ProgramApplication, ApplicationStatus } from '../entities/program-application.entity';
import { VirtualAccountService } from '../paystack/virtual-account.service';

@Injectable()
export class ApprovalEngineService {
  private readonly logger = new Logger(ApprovalEngineService.name);
  private get loanService(): LoanService {
    return this.moduleRef.get(LoanService, { strict: false });
  }
  private get memberService(): MemberService {
    return this.moduleRef.get(MemberService, { strict: false });
  }
  private get approvalService(): ApprovalService {
    return this.moduleRef.get(ApprovalService, { strict: false });
  }
  private get organisationService(): OrganisationService {
    return this.moduleRef.get(OrganisationService, { strict: false });
  }
  private get notificationService(): NotificationService {
    return this.moduleRef.get(NotificationService, { strict: false });
  }
  private get vaService(): VirtualAccountService {
    return this.moduleRef.get(VirtualAccountService, { strict: false });
  }

  constructor(
    @Inject(ModuleRef)
    private readonly moduleRef: ModuleRef,
    private readonly dataSource: DataSource,
  ) {}


  private workflows: Record<string, string[]> = {
    loan: [
      UserRole.SUB_ORG_ADMIN,
      UserRole.PARTNER_ADMIN,
      UserRole.SUPER_ADMIN,
    ],
    member_registration: [
      UserRole.PARTNER_ADMIN,
      UserRole.SUPER_ADMIN,
    ],
    organisation_onboarding: [
      UserRole.SUPER_ADMIN,
    ],
    program_application: [
      UserRole.PARTNER_ADMIN,
      UserRole.SUPER_ADMIN,
    ],
  };

  /**
   * Resolve the hierarchical approval chain for a member based on their organizational position.
   * If member is in a group → SUB_ORG_ADMIN → PARTNER_ADMIN → SUPER_ADMIN
   * If member is direct member of sub-org → SUB_ORG_ADMIN → PARTNER_ADMIN → SUPER_ADMIN
   * If member is direct member of partner → PARTNER_ADMIN → SUPER_ADMIN
   * If member is direct member of apex → SUPER_ADMIN only
   */
  async resolveApprovalChain(member: any): Promise<string[]> {
    if (!member) return [UserRole.SUPER_ADMIN];

    const chain: string[] = [];

    // Check if member is part of a group (deepest level)
    if (member.groupId && member.group?.organisationId) {
      // Member → Group → Sub-Org (or Partner)
      const groupOrg = member.group.organisationId;
      chain.push(UserRole.SUB_ORG_ADMIN); // Sub-org admin must approve first

      // Check if this sub-org has a parent (partner)
      if (member.group?.organisation?.parent?.id) {
        chain.push(UserRole.PARTNER_ADMIN); // Then partner admin
      }
    } else if (member.subOrgId) {
      // Member is direct member of sub-org
      chain.push(UserRole.SUB_ORG_ADMIN);
      
      // Load parent to see if sub-org has a parent
      const memberRepo = this.dataSource.getRepository('Member');
      const org = await this.dataSource.getRepository('Organisation').findOne({
        where: { id: member.subOrgId },
        relations: ['parent'],
      });
      if (org?.parent?.id) {
        chain.push(UserRole.PARTNER_ADMIN);
      }
    } else if (member.organisationId) {
      // Check if this org is a partner or if it's the apex
      const org = await this.dataSource.getRepository('Organisation').findOne({
        where: { id: member.organisationId },
        relations: ['parent'],
      });
      
      if (org?.type === 'partner') {
        // Direct member of partner org
        chain.push(UserRole.PARTNER_ADMIN);
      } else if (org?.type === 'sub_org') {
        // Shouldn't reach here (this would be caught by subOrgId check above)
        chain.push(UserRole.SUB_ORG_ADMIN);
        if (org.parent?.id) {
          chain.push(UserRole.PARTNER_ADMIN);
        }
      }
      // If apex (no parent), skip adding to chain
    }

    // Always end with SUPER_ADMIN
    if (!chain.includes(UserRole.SUPER_ADMIN)) {
      chain.push(UserRole.SUPER_ADMIN);
    }

    this.logger.log(`Resolved approval chain for member ${member.id}: ${chain.join(' → ')}`);
    return chain;
  }

  /**
   * Initialize a workflow for a given reference with optional dynamic approval chain.
   */
  async process(referenceType: string, referenceId: number, initiatorId: number, customChain?: string[]) {
    const roles = customChain || this.workflows[referenceType] || [UserRole.SUPER_ADMIN];
    
    await this.approvalService.create({
      requestType: referenceType,
      referenceId,
      initiatorId,
      totalLevels: roles.length,
      currentLevel: 1,
      status: ApprovalStatus.PENDING,
    });
    this.logger.log(`Started workflow for ${referenceType} ${referenceId} with ${roles.length} approval levels`);
  }

  /**
   * Special handler for loan approval that derives the hierarchy from member context.
   */
  async processLoanApproval(loanId: number, userId: number, member: any) {
    // Derive the approval chain from member's organizational hierarchy
    const approvalChain = await this.resolveApprovalChain(member);
    
    // Initialize workflow with the dynamic chain
    await this.process('loan', loanId, userId, approvalChain);
  }

  /**
   * Handle an approval decision and advance the workflow.
   */
  async advance(
    approvalId: number,
    approverId: number,
    decision: 'approved' | 'rejected',
    notes?: string,
  ) {
    const approval = await this.approvalService.findOne(approvalId);

    if (decision === 'approved') {
      const saved = await this.approvalService.approve(approvalId, approverId, notes);
      
      if (saved.status === ApprovalStatus.EXECUTED) {
        // Final Approval Logic
        await this.handleFinalApproval(approval);
        this.logger.log(`Workflow complete for ${approval.requestType} ${approval.referenceId}`);
      } else {
        // Partial Approval Logic
        await this.notificationService.trigger(
          approverId, 
          'Level Approval Granted', 
          `Step ${approval.currentLevel} of ${approval.totalLevels} completed for ${approval.requestType} #${approval.referenceId}`,
          [NotificationType.IN_APP]
        );
      }
      return saved;
    } else {
      // rejected
      const saved = await this.approvalService.reject(approvalId, approverId, notes);
      await this.handleRejection(approval, notes);
      this.logger.log(`Workflow rejected for ${approval.requestType} ${approval.referenceId}`);
      return saved;
    }
  }

  private async handleFinalApproval(approval: any) {
    const initiatorId = approval.initiatorId;
    switch (approval.requestType) {
      case 'loan':
        await this.loanService.update(approval.referenceId, { status: LoanStatus.APPROVED });
        await this.notificationService.trigger(initiatorId, 'Loan Approved', `Loan #${approval.referenceId} approved.`, [NotificationType.EMAIL, NotificationType.IN_APP]);
        break;
      case 'member_registration':
        await this.memberService.activate(approval.referenceId);
        // Automatically provision Paystack virtual account
        try {
          await this.vaService.provision(initiatorId);
        } catch (e) {
          this.logger.error(`Failed to auto-provision virtual account for user ${initiatorId}: ${e.message}`);
        }
        await this.notificationService.trigger(initiatorId, 'Membership Approved', `Welcome! Your NOGALSS membership has been approved.`, [NotificationType.EMAIL, NotificationType.IN_APP]);
        break;
      case 'organisation_onboarding':
        await this.organisationService.activate(approval.referenceId);
        await this.notificationService.trigger(initiatorId, 'Organization Approved', `Your organization has been onboarded successfully.`, [NotificationType.EMAIL, NotificationType.IN_APP]);
        break;
      case 'program_application':
        await this.dataSource.getRepository(ProgramApplication).update(approval.referenceId, { status: ApplicationStatus.APPROVED });
        await this.notificationService.trigger(initiatorId, 'Application Approved', `Your program application #${approval.referenceId} has been approved.`, [NotificationType.EMAIL, NotificationType.IN_APP]);
        break;
    }
  }

  private async handleRejection(approval: any, notes?: string) {
    const initiatorId = approval.initiatorId;
    switch (approval.requestType) {
      case 'loan':
        await this.loanService.update(approval.referenceId, { status: LoanStatus.REJECTED });
        await this.notificationService.trigger(initiatorId, 'Loan Declined', `Loan #${approval.referenceId} was declined. Notes: ${notes}`, [NotificationType.EMAIL, NotificationType.IN_APP]);
        break;
      case 'member_registration':
        await this.memberService.reject(approval.referenceId, notes);
        await this.notificationService.trigger(initiatorId, 'Membership Declined', `Your membership application was declined. Reason: ${notes}`, [NotificationType.EMAIL, NotificationType.IN_APP]);
        break;
      case 'program_application':
        await this.dataSource.getRepository(ProgramApplication).update(approval.referenceId, { status: ApplicationStatus.REJECTED });
        await this.notificationService.trigger(initiatorId, 'Application Declined', `Your program application #${approval.referenceId} was declined. Notes: ${notes}`, [NotificationType.EMAIL, NotificationType.IN_APP]);
        break;
    }
  }
}
