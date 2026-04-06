import { Injectable, Inject, forwardRef, OnModuleInit } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ModuleRef } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Loan, LoanStatus } from '../entities/loan.entity';
import { Member } from '../entities/member.entity';
import { ApprovalService } from '../approval/approval.service';
import { ApprovalEngineService } from '../approval/approval-engine.service';
import { ApprovalStatus } from '../entities/approval.entity';
import { EmailService } from '../email/email.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../entities/notification.entity';
import { CreateLoanDto } from './dto/loan.dto';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class LoanService {
  private get loanRepository(): Repository<Loan> {
    return this.moduleRef.get(getRepositoryToken(Loan), { strict: false });
  }
  private get approvalService(): ApprovalService {
    return this.moduleRef.get(ApprovalService, { strict: false });
  }
  private get approvalEngine(): ApprovalEngineService {
    return this.moduleRef.get(ApprovalEngineService, { strict: false });
  }
  private get emailService(): EmailService {
    return this.moduleRef.get(EmailService, { strict: false });
  }
  private get notificationService(): NotificationService {
    return this.moduleRef.get(NotificationService, { strict: false });
  }
  private get walletService(): any {
    try {
      return this.moduleRef.get('WalletService', { strict: false });
    } catch {
      return null;
    }
  }

  constructor(
    @Inject(ModuleRef)
    private moduleRef: ModuleRef,
  ) {}


  async create(data: CreateLoanDto): Promise<Loan> {
    const loan = this.loanRepository.create(data);
    return this.loanRepository.save(loan);
  }

  async requestLoan(userId: number, amount: number, interestRate: number, duration: number): Promise<Loan> {
    const member = await this.moduleRef.get(getRepositoryToken(Member), { strict: false }).findOne({ where: { userId } });
    if (!member) throw new NotFoundException('Member profile not found');

    const loan = this.loanRepository.create({
      member: { id: member.id } as any,
      amount,
      interestRate,
      status: LoanStatus.PENDING,
    });
    const saved = await this.loanRepository.save(loan);
    // start approval workflow via engine
    await this.approvalService.create({
      requestType: 'loan',
      referenceId: saved.id,
      initiator: { id: userId } as any,
      status: ApprovalStatus.PENDING,
      currentLevel: 1,
    });
    await this.approvalEngine.process('loan', saved.id, userId);
    return saved;
  }

  async findAll(): Promise<Loan[]> {
    return this.loanRepository.find({ relations: ['member', 'member.user', 'repaymentSchedule'] });
  }

  async findOne(id: number): Promise<Loan | null> {
    return this.loanRepository.findOne({ where: { id }, relations: ['member', 'member.user', 'repaymentSchedule'] });
  }

  async update(id: number, data: Partial<Loan>): Promise<Loan> {
    const loan = await this.findOne(id);
    if (!loan) throw new NotFoundException(`Loan with ID ${id} not found`);
    
    Object.assign(loan, data);
    return this.loanRepository.save(loan);
  }

  async approveLoan(id: number, approverId: number, comments?: string): Promise<Loan> {
    const loan = await this.findOne(id);
    if (!loan) throw new Error('Loan not found');

    await this.loanRepository.update(id, { status: LoanStatus.ACTIVE });
    const approvals = await this.approvalService.findAll();
    const pending = approvals.find(
      (a: any) => a.requestType === 'loan' && a.referenceId === id && a.status === 'pending',
    );
    if (pending) {
      await this.approvalEngine.advance(pending.id, approverId, 'approved', comments);
    }

    // DISBURSEMENT: Move funds to wallet
    if (this.walletService) {
      try {
        await this.walletService.disburseLoan(
          loan.memberId, 
          loan.amount, 
          loan.id, 
          `Loan disbursement for loan #${loan.id}`
        );
      } catch (err) {
        console.error('Failed to disburse loan funds:', err.message);
        // We might want to keep the status as inactive or something if disbursement fails
      }
    }

    if (loan?.member) {
      await this.notificationService.trigger(
        loan.member.id,
        'Loan Approved - Coop-OS',
        `Your loan of NGN ${loan.amount} has been approved and disbursed to your wallet.`,
        [NotificationType.EMAIL, NotificationType.SMS, NotificationType.PUSH, NotificationType.IN_APP]
      );
    }
    return loan;
  }

  async rejectLoan(id: number, approverId: number, comments?: string): Promise<Loan> {
    await this.loanRepository.update(id, { status: LoanStatus.REJECTED });
    const approvals = await this.approvalService.findAll();
    const pending = approvals.find(
      (a: any) => a.requestType === 'loan' && a.referenceId === id && a.status === 'pending',
    );
    if (pending) {
      await this.approvalEngine.advance(pending.id, approverId, 'rejected', comments);
    }

    const loan = await this.findOne(id);
    if (loan?.member?.user) {
      await this.emailService.queueEmail(
        loan.member.user.email,
        'loan_notification',
        'Loan Rejected - Coop-OS',
        'loan_notification',
        {
          name: loan.member.user.firstName,
          status: 'rejected',
          loanId: loan.id,
          amount: loan.amount,
          currency: 'NGN',
          comments,
        }
      );
    }
    return loan;
  }
}
