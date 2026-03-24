import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Wallet, WalletType } from '../entities/wallet.entity';
import { Ledger } from '../entities/ledger.entity';
import { Audit } from '../entities/audit.entity';
import { Transaction, TransactionType, TransactionStatus, TransactionChannel } from '../entities/transaction.entity';
import { LedgerService } from '../ledger/ledger.service';
import { EmailService } from '../email/email.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../entities/notification.entity';
import { SecurityService } from '../auth/security.service';
import { User } from '../entities/user.entity';
import { CreateWalletDto } from './dto/wallet.dto';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Audit)
    private auditRepository: Repository<Audit>,
    private ledgerService: LedgerService,
    private dataSource: DataSource,
    private emailService: EmailService,
    private notificationService: NotificationService,
    private securityService: SecurityService,
  ) {}

  async transfer(
    fromWalletId: number,
    toWalletId: number,
    amount: number,
    type: string,
    description: string,
    organisationId: number,
    ipAddress?: string,
    otp?: string,
  ) {
    if (amount <= 0) throw new Error('Amount must be positive');

    // Phase 9: 2FA for large transactions (threshold: 500k)
    const THRESHOLD = 500000;
    if (amount >= THRESHOLD && !otp) {
       throw new Error('2FA_REQUIRED');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Lock and Get Wallets
      const source = await queryRunner.manager.findOne(Wallet, {
        where: { id: fromWalletId },
        lock: { mode: 'pessimistic_write' },
      });
      const destination = await queryRunner.manager.findOne(Wallet, {
        where: { id: toWalletId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!source || !destination) throw new Error('Wallet not found');
      if (Number(source.balance) < amount) throw new Error('Insufficient balance');

      // 2. Update Balances
      const balanceBeforeSource = Number(source.balance);
      const balanceBeforeDest = Number(destination.balance);

      source.balance = Number(source.balance) - amount;
      destination.balance = Number(destination.balance) + amount;

      await queryRunner.manager.save(source);
      await queryRunner.manager.save(destination);

      // 3. Record Detailed Transaction
      const reference = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      const txn = queryRunner.manager.create(Transaction, {
        reference,
        amount,
        type: type as TransactionType,
        status: TransactionStatus.COMPLETED,
        channel: TransactionChannel.INTERNAL,
        fromWallet: source,
        toWallet: destination,
        balanceBefore: balanceBeforeSource,
        balanceAfter: Number(source.balance),
        description,
        organisationId,
        completedAt: new Date(),
      });
      await queryRunner.manager.save(txn);

      // 4. Record Ledger Entry
      const ledger = queryRunner.manager.create(Ledger, {
        sourceWallet: source,
        destinationWallet: destination,
        amount,
        sourceBalanceAfter: Number(source.balance),
        destinationBalanceAfter: Number(destination.balance),
        transactionId: txn.id,
        type,
        description,
        reference,
        status: 'completed',
      });
      await queryRunner.manager.save(ledger);

      // 5. Audit Log
      const audit = queryRunner.manager.create(Audit, {
        userId: source.ownerId, // Assuming ownerId is userId for member wallets
        action: 'WALLET_TRANSFER',
        entityType: 'Transaction',
        entityId: String(txn.id),
        details: `Transfer of ${amount} ${source.currency} to wallet #${toWalletId}`,
        ipAddress: ipAddress || 'unknown',
        metadata: { fromWalletId, toWalletId, amount, type, reference },
      });
      await queryRunner.manager.save(audit);

      await queryRunner.commitTransaction();

      // â”€â”€â”€ Trigger Alerts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      try {
        if (source.ownerId) {
           await this.securityService.alertLargeTransaction(source.ownerId, amount, source.currency);
           await this.notificationService.trigger(
             source.ownerId,
             'Debit Alert - Coop-OS',
             `You have successfully transferred ₦${amount.toLocaleString()} to wallet #${toWalletId}. Ref: ${reference}`,
             [NotificationType.EMAIL, NotificationType.IN_APP]
           );
        }

        if (destination.ownerId) {
          await this.notificationService.trigger(
            destination.ownerId,
            'Credit Alert - Coop-OS',
            `You have received ₦${amount.toLocaleString()} from wallet #${fromWalletId}. Ref: ${reference}`,
            [NotificationType.EMAIL, NotificationType.IN_APP]
          );
        }
      } catch (err) {
        console.error('Failed to trigger transfer alerts:', err.message);
      }

      return txn;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async create(data: CreateWalletDto): Promise<Wallet> {
    const wallet = this.walletRepository.create(data);
    return this.walletRepository.save(wallet);
  }

  async findAll(): Promise<Wallet[]> {
    return this.walletRepository.find();
  }

  async findOne(id: number): Promise<Wallet> {
    return this.walletRepository.findOne({ where: { id } });
  }

  async update(id: number, data: Partial<Wallet>): Promise<Wallet> {
    const wallet = await this.findOne(id);
    if (!wallet) throw new NotFoundException(`Wallet with ID ${id} not found`);
    
    Object.assign(wallet, data);
    return this.walletRepository.save(wallet);
  }

  async remove(id: number): Promise<void> {
    await this.walletRepository.delete(id);
  }

  // Current balance is now persistent
  async computeBalance(id: number): Promise<number> {
    const wallet = await this.findOne(id);
    return wallet ? Number(wallet.balance) : 0;
  }

  async getCustodialSummary() {
    const wallets = await this.walletRepository.find();
    const totalFunds = wallets.reduce((sum, w) => sum + Number(w.balance), 0);
    const activeWallets = wallets.filter(w => w.status === 'active').length;
    
    return {
      totalFunds,
      activeWallets,
      timestamp: new Date()
    };
  }

  async deposit(walletId: number, amount: number, description: string, ipAddress?: string): Promise<Transaction> {
    if (amount <= 0) throw new Error('Deposit amount must be positive');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { id: walletId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) throw new Error('Wallet not found');

      const balanceBefore = Number(wallet.balance);
      wallet.balance = balanceBefore + amount;
      await queryRunner.manager.save(wallet);

      const reference = `DEP-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      const txn = queryRunner.manager.create(Transaction, {
        reference,
        amount,
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.COMPLETED,
        channel: TransactionChannel.INTERNAL,
        toWallet: wallet,
        balanceAfter: Number(wallet.balance),
        description,
        organisationId: 1, // Defaulting to 1 for now, should ideally come from context
        completedAt: new Date(),
      } as any);
      await queryRunner.manager.save(txn);

      const ledger = queryRunner.manager.create(Ledger, {
        destinationWallet: wallet,
        amount,
        destinationBalanceAfter: Number(wallet.balance),
        transactionId: txn.id,
        type: 'deposit',
        description,
        reference,
        status: 'completed',
      } as any);
      await queryRunner.manager.save(ledger);

      await queryRunner.commitTransaction();
      return txn;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async withdraw(walletId: number, amount: number, description: string, ipAddress?: string, otp?: string): Promise<Transaction> {
    if (amount <= 0) throw new Error('Withdrawal amount must be positive');

    const THRESHOLD = 500000;
    if (amount >= THRESHOLD && !otp) {
        throw new Error('2FA_REQUIRED');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { id: walletId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) throw new Error('Wallet not found');
      if (Number(wallet.balance) < amount) throw new Error('Insufficient balance');

      const balanceBefore = Number(wallet.balance);
      wallet.balance = balanceBefore - amount;
      await queryRunner.manager.save(wallet);

      const reference = `WDL-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      const txn = queryRunner.manager.create(Transaction, {
        reference,
        amount,
        type: TransactionType.WITHDRAWAL,
        status: TransactionStatus.COMPLETED,
        channel: TransactionChannel.INTERNAL,
        fromWallet: wallet,
        balanceBefore,
        balanceAfter: Number(wallet.balance),
        description,
        organisationId: 1,
        completedAt: new Date(),
      } as any);
      await queryRunner.manager.save(txn);

      const ledger = queryRunner.manager.create(Ledger, {
        sourceWallet: wallet,
        amount,
        sourceBalanceAfter: Number(wallet.balance),
        transactionId: txn.id,
        type: 'withdrawal',
        description,
        reference,
        status: 'completed',
      } as any);
      await queryRunner.manager.save(ledger);

      await queryRunner.commitTransaction();
      return txn;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async disburseLoan(memberId: number, amount: number, loanId: number, description: string): Promise<Transaction> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { ownerId: memberId, type: WalletType.MEMBER },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) throw new Error('Member wallet not found');

      const balanceBefore = Number(wallet.balance);
      wallet.balance = balanceBefore + amount;
      await queryRunner.manager.save(wallet);

      const reference = `LN-DISB-${loanId}-${Date.now()}`;
      const txn = queryRunner.manager.create(Transaction, {
        reference,
        amount,
        type: TransactionType.LOAN_DISBURSEMENT,
        status: TransactionStatus.COMPLETED,
        channel: TransactionChannel.INTERNAL,
        toWallet: wallet,
        balanceAfter: Number(wallet.balance),
        description,
        organisationId: 1,
        completedAt: new Date(),
      } as any);
      await queryRunner.manager.save(txn);

      const ledger = queryRunner.manager.create(Ledger, {
        destinationWallet: wallet,
        amount,
        destinationBalanceAfter: Number(wallet.balance),
        transactionId: txn.id,
        type: 'loan_disbursement',
        description,
        reference,
        status: 'completed',
      } as any);
      await queryRunner.manager.save(ledger);

      await queryRunner.commitTransaction();
      return txn;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
