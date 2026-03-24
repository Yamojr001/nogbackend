import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { Organisation } from './organisation.entity';
import { Wallet } from './wallet.entity';
import { Member } from './member.entity';
import { Branch } from './branch.entity';
import { Group } from './group.entity';

export enum TransactionType {
  CONTRIBUTION = 'contribution',
  LOAN_DISBURSEMENT = 'loan_disbursement',
  LOAN_REPAYMENT = 'loan_repayment',
  WITHDRAWAL = 'withdrawal',
  DEPOSIT = 'deposit',
  TRANSFER_IN = 'transfer_in',
  TRANSFER_OUT = 'transfer_out',
  INTEREST_CREDIT = 'interest_credit',
  PENALTY = 'penalty',
  FEE = 'fee',
  SETTLEMENT = 'settlement',
  REVERSAL = 'reversal',
}

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REVERSED = 'reversed',
  CANCELLED = 'cancelled',
  PENDING_APPROVAL = 'pending_approval',
}

export enum TransactionChannel {
  BANK_TRANSFER = 'bank_transfer',
  MOBILE_MONEY = 'mobile_money',
  CASH = 'cash',
  USSD = 'ussd',
  CARD = 'card',
  INTERNAL  = 'internal', // System-generated (e.g., interest credit)
  PAYSTACK   = 'paystack', // Paystack virtual account or payment gateway
}

/**
 * Transaction â€“ Immutable ledger of all financial movements in the system.
 * Every financial event (contribution, loan, repayment, withdrawal) creates a transaction.
 * Records are NEVER deleted or modified. Reversals create new records.
 */
@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  reference: string; // e.g., TXN-20260310-001 (system-generated)

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ default: 'NGN' })
  currency: string;

  @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.PENDING })
  status: TransactionStatus;

  @Column({ type: 'enum', enum: TransactionChannel, default: TransactionChannel.INTERNAL })
  channel: TransactionChannel;

  @ManyToOne(() => Wallet, { nullable: true })
  @JoinColumn()
  fromWallet: Wallet;

  @Column({ nullable: true })
  fromWalletId: number;

  @ManyToOne(() => Wallet, { nullable: true })
  @JoinColumn()
  toWallet: Wallet;

  @Column({ nullable: true })
  toWalletId: number;

  @ManyToOne(() => Member, { nullable: true })
  @JoinColumn()
  member: Member;

  @Index()
  @Column({ nullable: true })
  memberId: number;

  @ManyToOne(() => Organisation)
  @JoinColumn()
  organisation: Organisation;

  @Index()
  @Column()
  organisationId: number;

  @ManyToOne(() => Branch, { nullable: true })
  @JoinColumn()
  branch: Branch;

  @Column({ nullable: true })
  branchId: number;

  @ManyToOne(() => Group, { nullable: true })
  @JoinColumn()
  group: Group;

  @Column({ nullable: true })
  groupId: number;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ nullable: true })
  balanceBefore: number; // Wallet balance before transaction

  @Column({ nullable: true })
  balanceAfter: number;  // Wallet balance after transaction

  @Column({ nullable: true })
  externalReference: string; // Bank/payment gateway reference

  @Column({ nullable: true })
  processedBy: number; // User ID of officer who processed

  @Column({ nullable: true })
  approvedBy: number; // User ID of approver (if required)

  @Column({ nullable: true })
  reversalOf: number; // ID of the original transaction (for reversals)

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true, type: 'timestamp' })
  completedAt: Date;
}
