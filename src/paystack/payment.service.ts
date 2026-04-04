import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
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
      throw new NotFoundException('Member profile not found');
    }

    if (user.memberProfile.isRegistrationFeePaid) {
      throw new BadRequestException('Registration fee already paid');
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

      return {
        status: 'success',
        data: response.data, // includes authorization_url and reference
      };
    } catch (err) {
      this.logger.error(`Paystack initialization failed for user ${userId} (${user.email}): ${err.message}`, err.stack);
      throw new BadRequestException(`Payment initialization failed: ${err.message}`);
    }
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
        this.logger.error(`Member ${memberId} not found during payment success handler`);
        return;
      }

      if (member.isRegistrationFeePaid) {
        this.logger.warn(`Member ${memberId} already paid. Skipping duplicate logic.`);
        return;
      }

      // 1. Update Member status
      await queryRunner.manager.update(Member, memberId, {
        isRegistrationFeePaid: true,
        paymentReference: reference,
        status: 'active',
      });

      // 2. Create Transaction
      const txn = queryRunner.manager.create(Transaction, {
        reference: `REG-FEE-${reference}`,
        type: TransactionType.DEPOSIT, 
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
      const savedTxn = await queryRunner.manager.save(txn);

      // 3. Create Ledger entry
      const ledger = queryRunner.manager.create(Ledger, {
        amount: this.REGISTRATION_FEE,
        type: 'registration_fee',
        description: `Registration Fee Payment - ${member.user?.email}`,
        source: 'Paystack',
        reference: `REG-FEE-${reference}`,
        status: 'completed',
        transactionId: savedTxn.id,
      } as any);
      await queryRunner.manager.save(ledger);

      await queryRunner.commitTransaction();
      this.logger.log(`Member ${memberId} successfully paid registration fee. Status updated to active.`);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to process registration success for member ${memberId}: ${err.message}`);
    } finally {
      await queryRunner.release();
    }
  }
}
