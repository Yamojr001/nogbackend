import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Organisation } from './organisation.entity';
import { User } from './user.entity';

export enum SettlementStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REVERSED = 'reversed',
}

export enum SettlementType {
  CONTRIBUTION_REMITTANCE = 'contribution_remittance', // Partner sends savings to Apex
  LOAN_CAPITAL_DRAWDOWN = 'loan_capital_drawdown',     // Apex releases loan funds to Partner
  PROFIT_SHARING = 'profit_sharing',                   // Apex distributes returns
  PENALTY_COLLECTION = 'penalty_collection',           // Penalties recovered from partner
  INTER_PARTNER_TRANSFER = 'inter_partner_transfer',   // Transfer between partners
}

/**
 * SettlementBatch â€“ Governs bulk financial settlements between NOGALSS Apex and Partners.
 * Every batch is approval-gated and creates a complete audit trail of inter-org fund flows.
 */
@Entity('settlement_batches')
export class SettlementBatch {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  batchReference: string; // e.g., STL-20260310-001

  @Column({ type: 'enum', enum: SettlementType })
  type: SettlementType;

  @ManyToOne(() => Organisation, { nullable: true })
  @JoinColumn()
  fromOrganisation: Organisation;

  @Column({ nullable: true })
  fromOrganisationId: number;

  @ManyToOne(() => Organisation, { nullable: true })
  @JoinColumn()
  toOrganisation: Organisation;

  @Column({ nullable: true })
  toOrganisationId: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  totalAmount: number;

  @Column({ default: 'NGN' })
  currency: string;

  @Column({ type: 'int', default: 0 })
  transactionCount: number; // Number of individual transactions in batch

  @Column({ type: 'enum', enum: SettlementStatus, default: SettlementStatus.DRAFT })
  status: SettlementStatus;

  @Column({ nullable: true })
  approvedBy: number; // FK to User (Finance Admin / Super Admin)

  @Column({ nullable: true, type: 'timestamp' })
  approvedAt: Date;

  @Column({ nullable: true })
  processedBy: number; // FK to User

  @Column({ nullable: true, type: 'timestamp' })
  processedAt: Date;

  @Column({ nullable: true })
  externalReference: string; // Bank transfer reference

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @ManyToOne(() => User)
  @JoinColumn()
  createdByUser: User;

  @Column()
  createdBy: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
