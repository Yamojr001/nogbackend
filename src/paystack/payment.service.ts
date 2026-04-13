import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Member } from '../entities/member.entity';
import { User } from '../entities/user.entity';
import { Transaction, TransactionType, TransactionStatus, TransactionChannel } from '../entities/transaction.entity';
import { Ledger } from '../entities/ledger.entity';
import { PaystackConfigService } from './paystack-config.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly REGISTRATION_FEE = 5500; // NGN

  constructor(
    @InjectRepository(Member)
    private readonly memberRepo: Repository<Member>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly paystackConfig: PaystackConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async initializeRegistrationPayment(userId: number) {
    const user = await this.userRepo.findOne({ 
      where: { id: userId },
      relations: ['memberProfile']
    });

    if (!user || !user.memberProfile) {
      return {
        status: 'failed',
        alreadyPaid: false,
        message: 'Member profile not found',
      };
    }

    if (user.memberProfile.hasPaidRegistrationFee) {
      return {
        status: 'success',
        alreadyPaid: true,
        message: 'Registration fee already paid',
      };
    }

    if (!(await this.paystackConfig.isEnabled())) {
      return {
        status: 'failed',
        alreadyPaid: false,
        message: 'Payment gateway is currently disabled. Please contact support.',
      };
    }

    try {
      const response = await this.paystackConfig.request<any>('POST', '/transaction/initialize', {
        email: user.email,
        amount: this.REGISTRATION_FEE * 100,
        callback_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/register/payment-success`,
        metadata: {
          userId: user.id,
          memberId: user.memberProfile.id,
          type: 'registration_fee',
        },
      });

      // Store reference temporarily
      await this.memberRepo.update(user.memberProfile.id, {
        paymentReference: response.data.reference,
      });

      // 0. Create Pending Transaction record
      try {
        const pendingTxn = this.dataSource.getRepository(Transaction).create({
          reference: `REG-FEE-${response.data.reference}`,
          type: TransactionType.FEE,
          amount: this.REGISTRATION_FEE,
          currency: 'NGN',
          status: TransactionStatus.PENDING,
          channel: TransactionChannel.PAYSTACK,
          memberId: user.memberProfile.id,
          organisationId: user.memberProfile.organisationId,
          branchId: user.memberProfile.branchId,
          groupId: user.memberProfile.groupId,
          balanceBefore: user.memberProfile.wallet?.balance || 0,
          balanceAfter: user.memberProfile.wallet?.balance || 0,
          description: `Membership Registration Fee (Pending) – ${user.email}`,
          externalReference: response.data.reference,
          createdAt: new Date(),
        } as any);
        await this.dataSource.getRepository(Transaction).save(pendingTxn);
      } catch (txnError) {
        this.logger.warn(`Failed to create pending transaction record: ${txnError.message}`);
      }

      return {
        status: 'success',
        data: response.data, // includes authorization_url and reference
      };
    } catch (err) {
    }
  }

  async initializeExternalPayment(email: string) {
    if (!(await this.paystackConfig.isEnabled())) {
      throw new BadRequestException('Payment gateway is currently disabled.');
    }

    try {
      const response = await this.paystackConfig.request<any>('POST', '/transaction/initialize', {
        email: email,
        amount: this.REGISTRATION_FEE * 100,
        callback_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/register/payment-success`,
        metadata: {
          email: email,
          type: 'registration_fee',
          isExternal: true,
        },
      });

      return {
        status: 'success',
        data: response.data,
      };
    } catch (err) {
      this.logger.error(`Paystack initialization failed for external email ${email}: ${err.message}`);
      throw new BadRequestException(`Payment initialization failed: ${err.message}`);
    }
  }

  async verifyExternalPayment(reference: string) {
    if (!reference?.trim()) {
      throw new BadRequestException('Payment reference is required');
    }

    try {
      const response = await this.paystackConfig.request<any>('GET', `/transaction/verify/${encodeURIComponent(reference)}`);
      const tx = response?.data;
      const paystackStatus = String(tx?.status ?? 'unknown').toLowerCase();
      const amountPaid = Number(tx?.amount ?? 0) / 100;

      if (paystackStatus !== 'success') {
        return {
          status: paystackStatus,
          message: `Payment status: ${paystackStatus}`,
        };
      }

      if (tx?.metadata?.type !== 'registration_fee') {
        throw new ForbiddenException('Invalid transaction type for registration.');
      }

      if (amountPaid < this.REGISTRATION_FEE) {
        throw new BadRequestException('Insufficient payment amount.');
      }

      return {
        status: 'success',
        amount: amountPaid,
        email: tx.customer?.email,
        reference: tx.reference,
      };
    } catch (err) {
      this.logger.error(`External payment verification failed for sequence ${reference}: ${err.message}`);
      throw err;
    }
  }

  async verifyRegistrationPayment(userId: number, reference: string) {
    if (!reference?.trim()) {
      throw new BadRequestException('Payment reference is required');
    }

    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['memberProfile'],
    });

    if (!user || !user.memberProfile) {
      throw new NotFoundException('Member profile not found');
    }

    const member = await this.memberRepo.findOne({
      where: { id: user.memberProfile.id },
      relations: ['wallet'],
    });

    if (!member) {
      throw new NotFoundException('Member profile not found');
    }

    if (user.memberProfile.hasPaidRegistrationFee) {
      return {
        status: 'success',
        isRegistrationFeePaid: true,
        message: 'Registration fee already marked as paid.',
      };
    }

    if (!(await this.paystackConfig.isEnabled())) {
      await this.recordRegistrationVerificationAttempt(member, {
        externalReference: reference,
        amount: 0,
        status: TransactionStatus.FAILED,
        description: 'Registration fee verification failed: payment gateway disabled',
      });

      return {
        status: 'failed',
        isRegistrationFeePaid: false,
        message: 'Payment gateway is currently disabled. Please contact support.',
      };
    }

    try {
      const response = await this.paystackConfig.request<any>('GET', `/transaction/verify/${encodeURIComponent(reference)}`);
      const tx = response?.data;
      const paystackStatus = String(tx?.status ?? 'unknown').toLowerCase();

      const amountPaid = Number(tx?.amount ?? 0) / 100;
      // Use Paystack transaction reference as canonical id across initialize, verify and webhook flows.
      const externalReference = tx?.reference ?? reference;

      const metadataMemberId = Number(tx?.metadata?.memberId);
      if (metadataMemberId && metadataMemberId !== user.memberProfile.id) {
        await this.recordRegistrationVerificationAttempt(member, {
          externalReference,
          amount: amountPaid,
          status: TransactionStatus.FAILED,
          description: `Registration fee verification failed: reference/member mismatch (paystack status: ${paystackStatus})`,
        });
        throw new ForbiddenException('Payment reference does not belong to this user.');
      }

      if (paystackStatus !== 'success') {
        await this.recordRegistrationVerificationAttempt(member, {
          externalReference,
          amount: amountPaid,
          status: paystackStatus === 'failed' ? TransactionStatus.FAILED : TransactionStatus.PENDING,
          description: `Registration fee payment verification returned status: ${paystackStatus}`,
        });

        return {
          status: paystackStatus,
          isRegistrationFeePaid: false,
          message: `Payment status from Paystack: ${paystackStatus}. Transaction detail has been saved.`,
        };
      }

      if (amountPaid < this.REGISTRATION_FEE) {
        await this.recordRegistrationVerificationAttempt(member, {
          externalReference,
          amount: amountPaid,
          status: TransactionStatus.FAILED,
          description: `Registration fee verification failed: insufficient amount (expected NGN ${this.REGISTRATION_FEE}, got NGN ${amountPaid})`,
        });

        return {
          status: 'failed',
          isRegistrationFeePaid: false,
          message: `Insufficient payment amount. Expected at least NGN ${this.REGISTRATION_FEE}, got NGN ${amountPaid}. Transaction detail has been saved.`,
        };
      }

      await this.handleRegistrationSuccess(
        user.memberProfile.id,
        externalReference,
      );

      return {
        status: 'success',
        isRegistrationFeePaid: true,
        hasPaidRegistrationFee: true,
        message: 'Payment verified. Registration status updated to paid and transaction history saved.',
      };
    } catch (err) {
      if (err instanceof NotFoundException || err instanceof ForbiddenException) {
        throw err;
      }

      await this.recordRegistrationVerificationAttempt(member, {
        externalReference: reference,
        amount: 0,
        status: TransactionStatus.PENDING,
        description: `Registration fee verification failed: ${err?.message ?? 'unknown error'}`,
      });

      this.logger.error(`Payment verification failed for user ${userId}: ${err.message}`, err.stack);
      return {
        status: 'pending',
        isRegistrationFeePaid: false,
        message: `Payment verification is pending due to connectivity/processing delay: ${err.message}. Transaction detail has been saved.`,
      };
    }
  }

  private async recordRegistrationVerificationAttempt(
    member: Member,
    input: {
      externalReference: string;
      amount: number;
      status: TransactionStatus;
      description: string;
    },
  ) {
    const existing = await this.dataSource.getRepository(Transaction).findOne({
      where: {
        externalReference: input.externalReference,
        memberId: member.id,
      } as any,
    });

    if (existing) {
      // Reconcile an existing attempt to the latest known status from Paystack.
      if (existing.status !== input.status || existing.description !== input.description) {
        existing.status = input.status;
        existing.description = input.description;
        existing.amount = Number(input.amount || 0);
        existing.completedAt = input.status === TransactionStatus.COMPLETED ? new Date() : existing.completedAt;
        await this.dataSource.getRepository(Transaction).save(existing);
      }
      return;
    }

    const reference = `REG-FEE-VERIFY-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    await this.dataSource.getRepository(Transaction).save(
      this.dataSource.getRepository(Transaction).create({
        reference,
        type: TransactionType.FEE,
        amount: Number(input.amount || 0),
        currency: 'NGN',
        status: input.status,
        channel: TransactionChannel.PAYSTACK,
        memberId: member.id,
        organisationId: member.organisationId,
        branchId: member.branchId,
        groupId: member.groupId,
        balanceBefore: member.wallet?.balance || 0,
        balanceAfter: member.wallet?.balance || 0,
        description: input.description,
        externalReference: input.externalReference,
        completedAt: input.status === TransactionStatus.COMPLETED ? new Date() : null,
      } as any),
    );
  }

  async handleRegistrationSuccess(memberId: number, reference: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const member = await queryRunner.manager.findOne(Member, { 
        where: { id: memberId },
        relations: ['user', 'wallet'] 
      });

      if (!member) {
        throw new Error(`Member ${memberId} not found during payment success handler`);
      }

      if (member.hasPaidRegistrationFee) {
        this.logger.warn(`Member ${memberId} already paid. Skipping duplicate logic.`);
        await queryRunner.rollbackTransaction();
        return;
      }

      // Try to update member status
      const memberTables = ['members', 'member', '"members"', '"member"'];
      let memberUpdateSuccess = false;
      for (const table of memberTables) {
        try {
          await queryRunner.query(
            `UPDATE ${table} SET has_paid_registration_fee = true, payment_reference = $1, status = 'active', kyc_status = 'verified' WHERE id = $2`,
            [reference, memberId]
          );
          memberUpdateSuccess = true;
          this.logger.log(`Successfully updated member status in table: ${table}`);
          break;
        } catch (e) { continue; }
      }

      if (!memberUpdateSuccess) {
        throw new Error('Failed to update member payment status in any known table variation');
      }

      // 1.1 Also update user status and payment status - using Raw SQL for reliability
      if (member.user) {
        const userTables = ['users', '"user"', 'user', '"users"'];
        let userUpdateSuccess = false;
        for (const table of userTables) {
          try {
            await queryRunner.query(
              `UPDATE ${table} SET status = 'active', is_verified = true, has_paid_registration_fee = true WHERE id = $1`,
              [member.user.id]
            );
            userUpdateSuccess = true;
            this.logger.log(`Successfully updated user status in table: ${table}`);
            break;
          } catch (e) { continue; }
        }
        if (!userUpdateSuccess) {
          this.logger.warn(`Failed to update user status for user ${member.user.id} in any known table variation`);
        }
      }

      // Attempt transaction record
      try {
        const txn = queryRunner.manager.create(Transaction, {
          reference: `REG-FEE-${reference}`,
          type: TransactionType.FEE,
          amount: this.REGISTRATION_FEE,
          currency: 'NGN',
          status: TransactionStatus.COMPLETED,
          channel: TransactionChannel.PAYSTACK,
          memberId: member.id,
          organisationId: member.organisationId,
          branchId: member.branchId,
          groupId: member.groupId,
          balanceBefore: member.wallet?.balance || 0,
          balanceAfter: member.wallet?.balance || 0, 
          description: `Membership Registration Fee – ${member.user?.email}`,
          externalReference: reference,
          completedAt: new Date(),
        } as any);
        await queryRunner.manager.save(txn);
      } catch (txnError) {
        this.logger.warn(`Failed to record transaction history: ${txnError.message}`);
      }

      await queryRunner.commitTransaction();
      this.logger.log(`Member ${memberId} registration fee payment processed successfully: REF=${reference}`);
    } catch (err) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      this.logger.error(`Failed to process registration success for member ${memberId}: ${err.message}`, err.stack);
      throw err; // RE-THROW so caller knows it failed
    } finally {
      await queryRunner.release();
    }
  }
}
