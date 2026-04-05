import {
  Injectable, Logger, ConflictException,
  NotFoundException, BadRequestException, ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as crypto from 'crypto';

import { VirtualAccount, VirtualAccountStatus } from '../entities/virtual-account.entity';
import { User } from '../entities/user.entity';
import { Wallet, WalletType } from '../entities/wallet.entity';
import { Transaction, TransactionType, TransactionStatus, TransactionChannel } from '../entities/transaction.entity';
import { Ledger } from '../entities/ledger.entity';
import { Audit } from '../entities/audit.entity';
import { Notification, NotificationType } from '../entities/notification.entity';
import { PaystackConfigService } from './paystack-config.service';
import { EmailService } from '../email/email.service';
import { PaymentService } from './payment.service';

@Injectable()
export class VirtualAccountService {
  private readonly logger = new Logger(VirtualAccountService.name);

  constructor(
    @InjectRepository(VirtualAccount)
    private readonly vaRepo: Repository<VirtualAccount>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    private readonly paystackConfig: PaystackConfigService,
    private readonly dataSource: DataSource,
    private readonly emailService: EmailService,
    private readonly paymentService: PaymentService,
  ) {}

  // ─── PUBLIC API ───────────────────────────────────────────────────────────

  /** Provision a Paystack dedicated virtual account for a verified user */
  async provision(userId: number): Promise<VirtualAccount> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (!user.isVerified) {
      throw new BadRequestException('User must be KYC-verified before provisioning a virtual account');
    }

    const existing = await this.vaRepo.findOne({ where: { userId } });
    if (existing) throw new ConflictException('User already has a virtual account');

    const enabled = await this.paystackConfig.isEnabled();
    if (!enabled) {
      // Create a placeholder record so the admin can activate later
      const placeholder = this.vaRepo.create({
        userId,
        status: VirtualAccountStatus.PENDING,
        currency: 'NGN',
      });
      return this.vaRepo.save(placeholder);
    }

    return this.callPaystackAndSave(user);
  }

  /** Admin can activate a pending virtual account once keys are configured */
  async activate(userId: number): Promise<VirtualAccount> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const record = await this.vaRepo.findOne({ where: { userId } });

    if (record?.accountNumber) {
      throw new ConflictException('Account already active with number ' + record.accountNumber);
    }

    return this.callPaystackAndSave(user, record ?? undefined);
  }

  /** Find a user's virtual account */
  async findByUserId(userId: number): Promise<VirtualAccount | null> {
    return this.vaRepo.findOne({ where: { userId } });
  }

  /** Used by admin listing */
  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await this.vaRepo.findAndCount({
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });
    return { data, total, page, limit };
  }

  // ─── WEBHOOK HANDLER ──────────────────────────────────────────────────────

  /**
   * Called by PaystackWebhookController after signature validation.
   * Processes dedicated_account.transaction.success and charge.success.
   */
  async handleWebhookEvent(event: string, data: any): Promise<void> {
    this.logger.log(`Processing Paystack webhook: ${event}`);

    const amountKobo: number = data?.amount ?? 0;
    const amountNGN   = amountKobo / 100;
    const reference: string = data?.reference ?? '';
    const paystackTxRef: string = data?.id?.toString() ?? reference;

    const metadata = data?.metadata;
    if (metadata?.type === 'registration_fee' && metadata?.memberId) {
      this.logger.log(`Detected registration fee payment for memberId: ${metadata.memberId}`);
      await this.paymentService.handleRegistrationSuccess(Number(metadata.memberId), paystackTxRef);
      return;
    }

    const accountNumber: string =
      data?.dedicated_account?.account_number ??
      data?.receiver_bank_account_number ??
      null;

    if (!accountNumber || amountNGN <= 0) {
      this.logger.warn('Webhook missing account_number or amount — skipped');
      return;
    }

    // --- Locate virtual account ---
    const va = await this.vaRepo.findOne({
      where: { accountNumber },
      relations: ['user'],
    });

    if (!va) {
      this.logger.error(`No virtual account found for account_number: ${accountNumber}`);
      return;
    }

    await this.creditWallet(va, amountNGN, reference, paystackTxRef, data);
  }

  // ─── SIGNATURE VERIFICATION ───────────────────────────────────────────────

  async verifyWebhookSignature(rawBody: Buffer, signature: string): Promise<boolean> {
    const secretKey = await this.paystackConfig.getSecretKey();
    if (!secretKey) return false;

    const expectedSig = crypto
      .createHmac('sha512', secretKey)
      .update(rawBody)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(expectedSig, 'hex'),
      Buffer.from(signature, 'hex'),
    );
  }

  // ─── INTERNAL HELPERS ─────────────────────────────────────────────────────

  private async callPaystackAndSave(user: User, existing?: VirtualAccount): Promise<VirtualAccount> {
    const enabled = await this.paystackConfig.isEnabled();
    if (!enabled) {
      throw new ServiceUnavailableException(
        'Paystack integration is not yet configured. Please ask your Super Admin to add the API key in Admin → Payment Settings.',
      );
    }

    try {
      // Step 1: Create or retrieve Paystack customer
      const customerCode = await this.ensurePaystackCustomer(user);

      // Step 2: Create dedicated account
      const preferredBank = await this.paystackConfig.getPreferredBank();
      const accountRes = await this.paystackConfig.request<any>(
        'POST',
        '/dedicated_account',
        {
          customer: customerCode,
          preferred_bank: preferredBank,
          currency: 'NGN',
          metadata: {
            user_id: user.id,
            name: `${user.firstName} ${user.lastName}`.trim() || user.name,
          },
        },
      );

      const acctData = accountRes.data;
      const record = existing ?? this.vaRepo.create({ userId: user.id });
      record.paystackCustomerCode  = customerCode;
      record.paystackAccountId     = acctData.id?.toString();
      record.accountNumber         = acctData.account_number;
      record.accountName           = acctData.account_name;
      record.bankName              = acctData.bank?.name ?? '';
      record.bankSlug              = acctData.bank?.slug ?? preferredBank;
      record.currency              = 'NGN';
      record.status                = VirtualAccountStatus.ACTIVE;
      record.rawPaystackResponse   = acctData;

      return this.vaRepo.save(record);
    } catch (err) {
      this.logger.error('Paystack account creation failed', err.message);
      throw new BadRequestException(`Paystack error: ${err.message}`);
    }
  }

  private async ensurePaystackCustomer(user: User): Promise<string> {
    // Try to find existing customer first
    try {
      const res = await this.paystackConfig.request<any>('GET', `/customer/${user.email}`);
      return res.data.customer_code;
    } catch {
      // Create new customer
      const res = await this.paystackConfig.request<any>('POST', '/customer', {
        email: user.email,
        first_name: user.firstName ?? user.name?.split(' ')[0] ?? '',
        last_name: user.lastName ?? user.name?.split(' ').slice(1).join(' ') ?? '',
        phone: user.phone ?? '',
        metadata: { coop_user_id: user.id },
      });
      return res.data.customer_code;
    }
  }

  private async creditWallet(
    va: VirtualAccount,
    amountNGN: number,
    reference: string,
    paystackTxRef: string,
    rawData: any,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find user's member wallet
      let wallet = await this.walletRepo.findOne({
        where: { ownerId: va.userId, type: WalletType.MEMBER },
      });

      if (!wallet) {
        // Auto-create wallet if missing
        wallet = this.walletRepo.create({
          ownerId: va.userId,
          type: WalletType.MEMBER,
          balance: 0,
          currency: 'NGN',
          status: 'active',
        });
        await queryRunner.manager.save(wallet);
      }

      const balanceBefore = Number(wallet.balance);
      const balanceAfter  = balanceBefore + amountNGN;

      // Update wallet balance
      await queryRunner.manager.update(Wallet, wallet.id, { balance: balanceAfter });

      // Update virtual account balance
      await queryRunner.manager.update(VirtualAccount, va.id, { balance: Number(va.balance) + amountNGN });

      // Create Transaction record
      const txnRef = `PAYSTACK-${paystackTxRef}`;
      const txn = queryRunner.manager.create(Transaction, {
        reference: txnRef,
        type: TransactionType.DEPOSIT,
        amount: amountNGN,
        currency: 'NGN',
        status: TransactionStatus.COMPLETED,
        channel: TransactionChannel.PAYSTACK,
        toWallet: wallet,
        balanceBefore,
        balanceAfter,
        description: `Virtual account deposit via ${va.bankName}`,
        externalReference: paystackTxRef,
        completedAt: new Date(),
      } as any);
      await queryRunner.manager.save(txn);

      // Double-entry Ledger
      const ledger = queryRunner.manager.create(Ledger, {
        destinationWallet: wallet,
        amount: amountNGN,
        destinationBalanceAfter: balanceAfter,
        type: 'deposit',
        description: `Paystack virtual account deposit – ${va.accountNumber}`,
        source: `Paystack (${va.bankName})`,
        reference: txnRef,
        status: 'completed',
        transactionId: txn.id,
      } as any);
      await queryRunner.manager.save(ledger);

      // Audit log
      const audit = queryRunner.manager.create(Audit, {
        userId: va.userId,
        action: 'VIRTUAL_ACCOUNT_DEPOSIT',
        entityType: 'Transaction',
        entityId: String(txn.id),
        details: `NGN ${amountNGN.toLocaleString()} deposited via Paystack into account ${va.accountNumber}`,
        ipAddress: 'paystack-webhook',
        metadata: rawData,
      } as any);
      await queryRunner.manager.save(audit);

      // In-app notification
      const notification = queryRunner.manager.create(Notification, {
        userId: va.userId,
        title: '💰 Wallet Credited',
        message: `Your wallet has been credited with NGN ${amountNGN.toLocaleString()}. New balance: NGN ${balanceAfter.toLocaleString()}.`,
        type: NotificationType.IN_APP,
        isRead: false,
      } as any);
      await queryRunner.manager.save(notification);

      await queryRunner.commitTransaction();

      // Send email (non-blocking)
      if (va.user?.email) {
        this.emailService.queueEmail(
          va.user.email,
          'transaction_alert',
          'Wallet Credited – NOGALSS',
          'transaction_alert',
          {
            name: va.user.firstName ?? va.user.name,
            type: 'CREDIT (Virtual Account Deposit)',
            amount: amountNGN,
            currency: 'NGN',
            reference: txnRef,
            date: new Date().toLocaleString('en-NG'),
            status: 'SUCCESS',
          },
        ).catch((e) => this.logger.warn('Email notification failed:', e.message));
      }

      this.logger.log(`Wallet credited: userId=${va.userId}, amount=NGN ${amountNGN}, balance=${balanceAfter}`);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error('creditWallet transaction failed', err.message);
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
