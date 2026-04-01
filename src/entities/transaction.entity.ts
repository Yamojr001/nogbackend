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
  @JoinColumn({ name: 'from_wallet_id' })
  fromWallet: Wallet;

  @Column({ name: 'from_wallet_id', nullable: true })
  fromWalletId: number;

  @ManyToOne(() => Wallet, { nullable: true })
  @JoinColumn({ name: 'to_wallet_id' })
  toWallet: Wallet;

  @Column({ name: 'to_wallet_id', nullable: true })
  toWalletId: number;

  @ManyToOne(() => Member, { nullable: true })
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @Index()
  @Column({ name: 'member_id', nullable: true })
  memberId: number;

  @ManyToOne(() => Organisation)
  @JoinColumn({ name: 'organisation_id' })
  organisation: Organisation;

  @Index()
  @Column({ name: 'organisation_id' })
  organisationId: number;

  @ManyToOne(() => Branch, { nullable: true })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @Column({ name: 'branch_id', nullable: true })
  branchId: number;

  @ManyToOne(() => Group, { nullable: true })
  @JoinColumn({ name: 'group_id' })
  group: Group;

  @Column({ name: 'group_id', nullable: true })
  groupId: number;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ name: 'balance_before', type: 'decimal', precision: 15, scale: 2, nullable: true })
  balanceBefore: number; 

  @Column({ name: 'balance_after', type: 'decimal', precision: 15, scale: 2, nullable: true })
  balanceAfter: number;  

  @Column({ name: 'external_reference', nullable: true })
  externalReference: string; 

  @Column({ name: 'processed_by', nullable: true })
  processedBy: number; 

  @Column({ name: 'approved_by', nullable: true })
  approvedBy: number; 

  @Column({ name: 'reversal_of', nullable: true })
  reversalOf: number; 

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'completed_at', nullable: true, type: 'timestamp' })
  completedAt: Date;

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
