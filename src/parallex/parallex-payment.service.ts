import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { Organisation } from '../entities/organisation.entity';
import { Transaction, TransactionType, TransactionStatus, TransactionChannel } from '../entities/transaction.entity';
import { Ledger } from '../entities/ledger.entity';
import { Wallet, WalletType } from '../entities/wallet.entity';
import { Member } from '../entities/member.entity';
import { Audit } from '../entities/audit.entity';
import { VirtualAccount, VirtualAccountStatus } from '../entities/virtual-account.entity';
import { ParallexConfigService } from './parallex-config.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../entities/notification.entity';
import * as crypto from 'crypto';

/**
 * Parallex Payment Service
 * Handles payment initialization, verification, and virtual account management
 */
@Injectable()
export class ParallexPaymentService {
  private readonly logger = new Logger(ParallexPaymentService.name);
  private readonly REGISTRATION_FEE = 5500; // NGN

  constructor(
    private readonly parallexConfig: ParallexConfigService,
    private readonly dataSource: DataSource,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(Member)
    private readonly memberRepo: Repository<Member>,
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(Audit)
    private readonly auditRepo: Repository<Audit>,
    @InjectRepository(VirtualAccount)
    private readonly virtualAccountRepo: Repository<VirtualAccount>,
    @InjectRepository(Organisation)
    private readonly organisationRepo: Repository<Organisation>,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Initialize payment via Parallex
   * @param userId User ID
   * @param amount Amount in NGN
   * @param metadata Additional metadata
   */
  async initializePayment(userId: number, amount: number, metadata?: any) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const enabled = await this.parallexConfig.isEnabled();
    if (!enabled) {
      throw new ServiceUnavailableException(
        'Parallex payment gateway is currently disabled. Please contact support.',
      );
    }

    try {
      this.logger.log(`[Parallex] Initializing payment for user ${userId}: NGN ${amount}`);

      // Call Parallex payment initialization endpoint
      // Adjust endpoint based on actual Parallex API documentation
      const endpoint = process.env.PARALLEX_PAYMENT_INIT_ENDPOINT || '/api/v1/payments/initiate';
      const response = await this.parallexConfig.request(
        'POST',
        endpoint,
        {
          amount,
          currency: 'NGN',
          email: user.email,
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          reference: `NGO-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          description: metadata?.description || 'Payment - NOGALSS Cooperative',
          callbackUrl: `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/parallex/webhook`,
          metadata: {
            userId,
            ...metadata,
          },
        },
      );

      const data = response.data as any;

      // Store pending transaction
      const txn = this.transactionRepo.create({
        reference: data.reference || `TXN-${Date.now()}`,
        type: TransactionType.DEPOSIT,
        amount,
        currency: 'NGN',
        status: TransactionStatus.PENDING,
        channel: TransactionChannel.PAYSTACK,
        externalReference: data.id || data.reference,
        description: metadata?.description || 'Payment pending',
      });
      await this.transactionRepo.save(txn);

      return {
        status: 'success',
        reference: data.reference,
        paymentUrl: data.authorizationUrl || data.checkoutUrl,
        data,
      };
    } catch (err) {
      this.logger.error(`[Parallex] Payment initialization failed: ${err.message}`);
      throw new BadRequestException(`Payment initialization failed: ${err.message}`);
    }
  }

  /**
   * Verify payment status
   * @param reference Payment reference
   */
  async verifyPayment(reference: string) {
    if (!reference?.trim()) {
      throw new BadRequestException('Payment reference is required');
    }

    const enabled = await this.parallexConfig.isEnabled();
    if (!enabled) {
      throw new ServiceUnavailableException('Parallex payment gateway is currently disabled');
    }

    try {
      this.logger.log(`[Parallex] Verifying payment: ${reference}`);

      // Call Parallex payment verification endpoint
      const endpoint =
        (process.env.PARALLEX_PAYMENT_VERIFY_ENDPOINT || '/api/v1/payments/{reference}').replace(
          '{reference}',
          reference,
        );
      const response = await this.parallexConfig.request('GET', endpoint);

      const data = response.data as any;
      const status = data.status?.toLowerCase() || 'unknown';
      const isSuccessful = status === 'success' || status === 'completed' || data.paid === true;

      return {
        status: isSuccessful ? 'success' : status,
        verified: isSuccessful,
        amount: data.amount,
        reference: data.reference || reference,
        data,
      };
    } catch (err) {
      this.logger.error(`[Parallex] Payment verification failed: ${err.message}`);
      throw new BadRequestException(`Payment verification failed: ${err.message}`);
    }
  }

  /**
   * Register customer on Parallex
   * @param data Customer registration data
   */
  async registerCustomer(data: {
    firstName: string;
    lastName: string;
    middleName?: string;
    dob?: string;
    gender?: string;
    address: string;
    phone: string;
    email: string;
    customerType: 'INDIVIDUAL' | 'ORGANISATION';
    bvn: string;
  }) {
    this.logger.log(`[Parallex] Registering customer: ${data.email}`);
    const endpoint = process.env.PARALLEX_REGISTER_ENDPOINT || '/virtualaccount/VirtualAccount/v1/VirtualAccount/Register';
    const response = await this.parallexConfig.request('POST', endpoint, data);

    if (response.data.responseCode !== '00') {
      this.logger.error(`[Parallex] Customer registration failed: ${response.data.responseDescription}`);
      // If customer already exists, we might get a different code, but we can continue
      if (!response.data.responseDescription.toLowerCase().includes('already exists')) {
        throw new BadRequestException(`Customer registration failed: ${response.data.responseDescription}`);
      }
    }

    return response.data;
  }

  /**
   * Create virtual account for user
   * @param userId User ID
   */
   async createVirtualAccount(userId: number, dto?: {
    firstName?: string;
    lastName?: string;
    middleName?: string;
    phone?: string;
    email?: string;
    bvn?: string;
    address?: string;
  }) {
    if (!userId) {
      throw new BadRequestException('User ID is required for virtual account creation');
    }
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update user info if provided in DTO
    if (dto) {
      if (dto.firstName) user.firstName = dto.firstName;
      if (dto.lastName) user.lastName = dto.lastName;
      if (dto.phone) user.phone = dto.phone;
      if (dto.bvn) user.bvn = dto.bvn;
      await this.userRepo.save(user);
    }

    const enabled = await this.parallexConfig.isEnabled();
    if (!enabled) {
      throw new ServiceUnavailableException('Parallex virtual account service is currently disabled');
    }

    try {
      // Step 1: Register customer if not already done
      await this.registerCustomer({
        firstName: dto?.firstName || user.firstName,
        lastName: dto?.lastName || user.lastName,
        address: dto?.address || 'NOGALSS Cooperative Address',
        phone: dto?.phone || user.phone || '00000000000',
        email: dto?.email || user.email,
        customerType: 'INDIVIDUAL',
        bvn: dto?.bvn || user.bvn || '00000000000',
      }).catch(e => this.logger.warn(`Registration step: ${e.message}`));

      this.logger.log(`[Parallex] Generating permanent account for user ${userId}`);

      // Step 2: Generate permanent account number
      const endpoint = process.env.PARALLEX_VA_ENDPOINT || '/virtualaccount/VirtualAccount/v1/VirtualAccount/GeneratePermanentAccountNumber';
      const accountReference = `USER-${userId}-${Date.now()}`;
      const response = await this.parallexConfig.request(
        'POST',
        endpoint,
        {
          firstName: dto?.firstName || user.firstName,
          lastName: dto?.lastName || user.lastName,
          middleName: dto?.middleName || '',
        },
      );

      const data = response.data as any;
      if (data.responseCode !== '00') {
        throw new Error(data.responseDescription);
      }

      const accountData = data.data;

      // Store virtual account details
      let va = await this.virtualAccountRepo.findOne({ where: { userId, gateway: 'parallex' } });
      if (!va) {
        va = this.virtualAccountRepo.create({
          userId,
          accountNumber: accountData.accountNumber,
          accountName: accountData.accountName,
          bankName: accountData.bankName || 'Parallex Bank',
          parallexAccountId: accountReference,
          gateway: 'parallex',
          status: VirtualAccountStatus.ACTIVE,
          rawParallexResponse: data,
        });
      } else {
        va.accountNumber = accountData.accountNumber;
        va.accountName = accountData.accountName;
        va.bankName = accountData.bankName || 'Parallex Bank';
        va.status = VirtualAccountStatus.ACTIVE;
        va.rawParallexResponse = data;
      }
      await this.virtualAccountRepo.save(va);

      return {
        status: 'success',
        accountNumber: accountData.accountNumber,
        accountName: accountData.accountName,
        bankName: accountData.bankName,
      };
    } catch (err) {
      this.logger.error(`[Parallex] User VA creation failed: ${err.message}`);
      throw new BadRequestException(`User virtual account creation failed: ${err.message}`);
    }
  }

  /**
   * Create virtual account for organisation
   * @param organisationId Organisation ID
   */
  async createOrganisationVirtualAccount(organisationId: number) {
    const org = await this.organisationRepo.findOne({ where: { id: organisationId } });
    if (!org) {
      throw new NotFoundException('Organisation not found');
    }

    const enabled = await this.parallexConfig.isEnabled();
    if (!enabled) {
      throw new ServiceUnavailableException('Parallex virtual account service is currently disabled');
    }

    try {
      // Step 1: Register organisation
      await this.registerCustomer({
        firstName: org.name,
        lastName: 'Organisation',
        address: 'NOGALSS Organisation Address',
        phone: org.phone || '00000000000',
        email: org.email || 'cooperative@nogalss.org',
        customerType: 'ORGANISATION',
        bvn: '00000000000', // Or org-specific ID if available
      }).catch(e => this.logger.warn(`Org registration step: ${e.message}`));

      this.logger.log(`[Parallex] Generating permanent account for organisation ${organisationId}`);

      // Step 2: Generate permanent account number
      const endpoint = process.env.PARALLEX_VA_ENDPOINT || '/virtualaccount/VirtualAccount/v1/VirtualAccount/GeneratePermanentAccountNumber';
      const accountReference = `ORG-${organisationId}-${Date.now()}`;
      const response = await this.parallexConfig.request(
        'POST',
        endpoint,
        {
          firstName: org.name,
          lastName: 'Organisation',
          middleName: '',
        },
      );

      const data = response.data as any;
      if (data.responseCode !== '00') {
        throw new Error(data.responseDescription);
      }

      const accountData = data.data;

      // Store virtual account details
      let va = await this.virtualAccountRepo.findOne({ where: { organisationId, gateway: 'parallex' } });
      if (!va) {
        va = this.virtualAccountRepo.create({
          organisationId,
          accountNumber: accountData.accountNumber,
          accountName: accountData.accountName,
          bankName: accountData.bankName || 'Parallex Bank',
          parallexAccountId: accountReference,
          gateway: 'parallex',
          status: VirtualAccountStatus.ACTIVE,
          rawParallexResponse: data,
        });
      } else {
        va.accountNumber = accountData.accountNumber;
        va.accountName = accountData.accountName;
        va.bankName = accountData.bankName || 'Parallex Bank';
        va.status = VirtualAccountStatus.ACTIVE;
        va.rawParallexResponse = data;
      }
      await this.virtualAccountRepo.save(va);

      return {
        status: 'success',
        accountNumber: accountData.accountNumber,
        accountName: accountData.accountName,
        bankName: accountData.bankName,
      };
    } catch (err) {
      this.logger.error(`[Parallex] Org VA creation failed: ${err.message}`);
      throw new BadRequestException(`Organisation virtual account creation failed: ${err.message}`);
    }
  }

  /**
   * Get supported banks from Parallex virtual account service.
   */
  async getBanks() {
    const enabled = await this.parallexConfig.isEnabled();
    if (!enabled) {
      throw new ServiceUnavailableException('Parallex virtual account service is currently disabled');
    }

    const endpoint = process.env.PARALLEX_GET_BANKS_ENDPOINT || '/virtualaccount/VirtualAccount/v1/VirtualAccount/GetBanks';
    const response = await this.parallexConfig.request('GET', endpoint);
    return response.data;
  }

  /**
   * Retrieve billing amount for a merchant using third-party transfer service.
   */
  async fetchUserBillingAmount() {
    const enabled = await this.parallexConfig.isEnabled();
    if (!enabled) {
      throw new ServiceUnavailableException('Parallex third-party transfer service is currently disabled');
    }

    const endpoint = process.env.PARALLEX_TPT_BILLING_ENDPOINT || '/ThirdpartyTransferService/api/ThirdPartyTransfer/FetchUserBIllingAmount';
    const response = await this.parallexConfig.request('GET', endpoint);
    return response.data;
  }

  /**
   * Name Enquiry (Validate Bank Account)
   * @param accountNumber Destination account number
   * @param bankCode Destination bank code
   */
  async nameEnquiry(accountNumber: string, bankCode?: string) {
    const enabled = await this.parallexConfig.isEnabled();
    if (!enabled) {
      throw new ServiceUnavailableException('Parallex transfer service is currently disabled');
    }

    try {
      this.logger.log(`[Parallex] Name enquiry for account ${accountNumber}`);
      const endpoint = process.env.PARALLEX_NAME_ENQUIRY_ENDPOINT || '/virtualaccount/VirtualAccount/v1/VirtualAccount/NameEnquiry';
      const response = await this.parallexConfig.request('POST', endpoint, {
        accountNumber,
        // Some implementations might need bankCode here if it's inter-bank, 
        // but the provided docs only show accountNumber.
      });

      if (response.data.responseCode && response.data.responseCode !== '00') {
        throw new Error(response.data.responseDescription || 'Name enquiry failed');
      }

      return {
        status: 'success',
        accountName: response.data.accountName || response.data.data?.accountName,
        accountNumber: response.data.accountNumber || response.data.data?.accountNumber,
        data: response.data,
      };
    } catch (err) {
      this.logger.error(`[Parallex] Name enquiry failed: ${err.message}`);
      throw new BadRequestException(`Account validation failed: ${err.message}`);
    }
  }

  /**
   * Initiate Outbound Transfer (Payout)
   * @param userId User initiating the transfer
   * @param amount Amount to transfer
   * @param accountNumber Destination account
   * @param bankCode Destination bank code
   * @param narration Transfer description
   */
  async initiateTransfer(userId: number, amount: number, accountNumber: string, bankCode: string, narration: string = 'Payout', beneficiaryName?: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const enabled = await this.parallexConfig.isEnabled();
    if (!enabled) {
      throw new ServiceUnavailableException('Parallex transfer service is currently disabled');
    }

    // Get user's source virtual account
    const va = await this.virtualAccountRepo.findOne({ where: { userId, gateway: 'parallex' } });
    if (!va || !va.accountNumber) {
      throw new BadRequestException('User does not have a Parallex virtual account to transfer from');
    }

    try {
      const reference = `TRF-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      this.logger.log(`[Parallex] Initiating transfer for user ${userId}: NGN ${amount} to ${accountNumber}`);

      const endpoint = process.env.PARALLEX_TRANSFER_ENDPOINT || '/virtualaccount/VirtualAccount/v1/VirtualAccount/InterTransfer';
      const response = await this.parallexConfig.request('POST', endpoint, {
        sourceAccountNumber: va.accountNumber,
        amount,
        beneficiaryAccountNumber: accountNumber,
        beneficiaryBankCode: bankCode,
        narration,
        pin: process.env.PARALLEX_TRANSACTION_PIN || '',
        username: process.env.PARALLEX_USERNAME || '',
        beneficiaryAccountName: beneficiaryName || 'Beneficiary',
        transactionReference: reference,
      });

      const data = response.data as any;
      if (data.responseCode !== '00') {
        throw new Error(data.responseDescription);
      }

      // Store pending withdrawal transaction
      const txn = this.transactionRepo.create({
        reference,
        type: TransactionType.WITHDRAWAL,
        amount,
        currency: 'NGN',
        status: TransactionStatus.COMPLETED, // Or PENDING if it's asynchronous
        channel: TransactionChannel.BANK_TRANSFER,
        externalReference: reference,
        description: narration,
        metadata: {
          destinationAccount: accountNumber,
          destinationBank: bankCode,
          gateway: 'parallex',
        },
        organisationId: va.organisationId || (user.organisationId),
      });
      await this.transactionRepo.save(txn);

      return {
        status: 'success',
        reference,
        message: 'Transfer initiated successfully',
        data,
      };
    } catch (err) {
      this.logger.error(`[Parallex] Transfer initiation failed: ${err.message}`);
      throw new BadRequestException(`Transfer initiation failed: ${err.message}`);
    }
  }

  /**
   * Register Webhook URL with Parallex
   * @param callbackUrl Public URL to receive notifications
   */
  async registerWebhook(callbackUrl: string) {
    this.logger.log(`[Parallex] Registering webhook URL: ${callbackUrl}`);
    const endpoint = '/virtualaccount/VirtualAccount/v1/VirtualAccount/AddWebHookURL';
    const response = await this.parallexConfig.request('POST', endpoint, {
      callBackURL: callbackUrl,
      webHookType: 'INFLOW',
    });

    if (response.data.responseCode !== '00') {
      throw new Error(`Webhook registration failed: ${response.data.responseDescription}`);
    }

    return response.data;
  }

  /**
   * Enable outflow processing for the merchant
   * @param transactionPassword Password to validate outflows
   */
  async enableOutflowProcessing(transactionPassword: string) {
    this.logger.log('[Parallex] Enabling outflow processing');
    const endpoint = '/virtualaccount/VirtualAccount/v1/VirtualAccount/EnableOutflowProcessing';
    const response = await this.parallexConfig.request('POST', endpoint, {
      enableOutFlow: true,
      transactionPassword: Buffer.from(transactionPassword).toString('base64'),
    });

    if (response.data.responseCode !== '00') {
      throw new Error(`Enable outflow failed: ${response.data.responseDescription}`);
    }

    return response.data;
  }

  /**
   * Handle Parallex webhook for payment status updates
   */
  async handleWebhook(event: string, data: any) {
    this.logger.log(`[Parallex Webhook] Processing event: ${event}`);

    try {
      if (event === 'payment.completed' || event === 'charge.success') {
        await this.handlePaymentSuccess(data);
      } else if (event === 'payment.failed' || event === 'charge.failed') {
        await this.handlePaymentFailure(data);
      } else if (event === 'virtualaccount.credit') {
        await this.handleVirtualAccountCredit(data);
      }

      return { status: 'success', processed: true };
    } catch (err) {
      this.logger.error(`[Parallex Webhook] Processing failed: ${err.message}`);
      throw new BadRequestException(`Webhook processing failed: ${err.message}`);
    }
  }

  /**
   * Handle successful payment
   */
  private async handlePaymentSuccess(data: any) {
    const reference = data.reference || data.id;
    const userId = data.metadata?.userId;
    const amount = Number(data.amount) || 0;

    this.logger.log(`[Parallex] Payment successful: ref=${reference}, user=${userId}, amount=${amount}`);

    if (!userId) {
      this.logger.warn('[Parallex] Payment success webhook missing userId');
      return;
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return;

    // Update transaction to completed
    const txn = await this.transactionRepo.findOne({
      where: { externalReference: reference },
    });

    if (txn) {
      txn.status = TransactionStatus.COMPLETED;
      txn.completedAt = new Date();
      await this.transactionRepo.save(txn);
    }

    // Send notification
    try {
      await this.notificationService.trigger(
        userId,
        'Payment Successful',
        `Your payment of NGN ${amount} has been processed successfully. Reference: ${reference}`,
        [NotificationType.SMS, NotificationType.EMAIL, NotificationType.IN_APP],
      );
    } catch (err) {
      this.logger.warn(`Failed to send payment success notification: ${err.message}`);
    }
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailure(data: any) {
    const reference = data.reference || data.id;
    const userId = data.metadata?.userId;
    const reason = data.reason || 'Unknown error';

    this.logger.warn(`[Parallex] Payment failed: ref=${reference}, reason=${reason}`);

    if (!userId) return;

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return;

    // Update transaction to failed
    const txn = await this.transactionRepo.findOne({
      where: { externalReference: reference },
    });

    if (txn) {
      txn.status = TransactionStatus.FAILED;
      await this.transactionRepo.save(txn);
    }

    // Send notification
    try {
      await this.notificationService.trigger(
        userId,
        'Payment Failed',
        `Your payment failed. Reason: ${reason}. Reference: ${reference}. Please try again.`,
        [NotificationType.SMS, NotificationType.EMAIL, NotificationType.IN_APP],
      );
    } catch (err) {
      this.logger.warn(`Failed to send payment failure notification: ${err.message}`);
    }
  }

  /**
   * Handle virtual account credit
   */
  private async handleVirtualAccountCredit(data: any) {
    const accountNumber = data.accountNumber || data.account;
    const amount = Number(data.amount) || 0;

    this.logger.log(`[Parallex] Virtual account credit: account=${accountNumber}, amount=${amount}`);

    const va = await this.virtualAccountRepo.findOne({
      where: { accountNumber, gateway: 'parallex' },
      relations: ['user', 'organisation'],
    });

    if (!va || (!va.user && !va.organisation)) {
      this.logger.warn(`[Parallex] Virtual account credit received for unknown account or entity: ${accountNumber}`);
      return;
    }

    const reference = data.reference || `VAC-${Date.now()}`;

    // Ensure idempotency (check if we already processed this reference)
    const existingTxn = await this.transactionRepo.findOne({ where: { externalReference: reference } });
    if (existingTxn) {
      this.logger.log(`[Parallex] Webhook already processed for reference: ${reference}`);
      return;
    }

    // Save transaction
    const txn = this.transactionRepo.create({
      reference,
      type: TransactionType.DEPOSIT,
      amount,
      currency: 'NGN',
      status: TransactionStatus.COMPLETED,
      channel: TransactionChannel.BANK_TRANSFER,
      externalReference: reference,
      description: 'Virtual Account Deposit',
      metadata: { gateway: 'parallex', accountNumber },
      completedAt: new Date(),
      organisationId: va.organisationId || (va.user ? va.user.organisationId : null),
    });
    await this.transactionRepo.save(txn);

    // Execute database transaction for wallet credit
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find wallet (Member or Organisation)
      let wallet: Wallet;
      if (va.userId) {
        wallet = await queryRunner.manager.findOne(Wallet, {
          where: { ownerId: va.userId, ownerType: WalletType.MEMBER },
        });

        if (!wallet) {
          wallet = queryRunner.manager.create(Wallet, {
            ownerId: va.userId,
            ownerType: WalletType.MEMBER,
            balance: 0,
            currency: 'NGN',
            status: 'active',
          });
          await queryRunner.manager.save(wallet);
        }
      } else {
        wallet = await queryRunner.manager.findOne(Wallet, {
          where: { ownerId: va.organisationId, ownerType: WalletType.ORGANISATION },
        });

        if (!wallet) {
          wallet = queryRunner.manager.create(Wallet, {
            ownerId: va.organisationId,
            ownerType: WalletType.ORGANISATION,
            balance: 0,
            currency: 'NGN',
            status: 'active',
          });
          await queryRunner.manager.save(wallet);
        }
      }

      const balanceBefore = Number(wallet.balance);
      const balanceAfter = balanceBefore + amount;

      // Update wallet balance
      await queryRunner.manager.update(Wallet, wallet.id, { balance: balanceAfter });

      // Update virtual account cumulative balance if applicable
      await queryRunner.manager.update(VirtualAccount, va.id, { balance: Number(va.balance) + amount });

      // Update Member Contribution Balance if it's a member
      let member: Member;
      if (va.userId) {
        member = await queryRunner.manager.findOne(Member, { where: { userId: va.userId } });
        if (member) {
          member.contributionBalance = Number(member.contributionBalance) + amount;
          await queryRunner.manager.save(member);
        }
      }

      // Create Transaction record
      const txn = queryRunner.manager.create(Transaction, {
        reference,
        type: va.userId ? TransactionType.CONTRIBUTION : TransactionType.DEPOSIT,
        amount,
        currency: 'NGN',
        status: TransactionStatus.COMPLETED,
        channel: TransactionChannel.BANK_TRANSFER,
        toWallet: wallet,
        memberId: member?.id,
        balanceBefore,
        balanceAfter,
        description: `Virtual account deposit via Parallex (${va.bankName})`,
        externalReference: reference,
        organisationId: va.organisationId || member?.organisationId || 1,
        completedAt: new Date(),
      } as any);
      await queryRunner.manager.save(txn);

      // Double-entry Ledger
      const ledger = queryRunner.manager.create(Ledger, {
        destinationWallet: wallet,
        amount,
        destinationBalanceAfter: balanceAfter,
        type: 'deposit',
        description: `Parallex virtual account deposit – ${va.accountNumber}`,
        source: `Parallex (${va.bankName})`,
        reference,
        status: 'completed',
        transactionId: txn.id,
        organisationId: va.organisationId || member?.organisationId || 1,
      } as any);
      await queryRunner.manager.save(ledger);

      // Audit log
      await queryRunner.manager.save(
        queryRunner.manager.create(Audit, {
          userId: va.userId || (va.organisation as any)?.representativeUserId,
          action: 'VA_DEPOSIT',
          entityType: 'Transaction',
          entityId: String(txn.id),
          details: `NGN ${amount.toLocaleString()} deposited via Parallex into account ${va.accountNumber}`,
          ipAddress: 'parallex-webhook',
          metadata: data,
        } as any)
      );

      await queryRunner.commitTransaction();

      // Send notification
      try {
        const recipientId = va.userId || (va.organisation as any)?.representativeUserId;
        if (recipientId) {
          await this.notificationService.trigger(
            recipientId,
            'Wallet Funded',
            `Your ${va.organisationId ? 'organisation' : 'personal'} wallet has been funded with NGN ${amount.toLocaleString()} via bank transfer.`,
            [NotificationType.IN_APP, NotificationType.EMAIL],
          );
        }
      } catch (err) {
        this.logger.warn(`Failed to send VA credit notification: ${err.message}`);
      }
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`[Parallex] Wallet credit transaction failed: ${err.message}`);
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(body: string, signature: string): boolean {
    const secret = process.env.PARALLEX_WEBHOOK_SECRET || '';
    if (!secret) return false;

    const computed = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    return computed === signature;
  }
}
