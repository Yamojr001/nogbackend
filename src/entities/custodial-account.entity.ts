import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum CustodialAccountType {
  RESERVE_FUND = 'reserve_fund',         // Main NOGALSS reserve
  SETTLEMENT_POOL = 'settlement_pool',   // Holds funds before inter-org settlement
  PARTNER_ESCROW = 'partner_escrow',     // Holds partner funds during dispute
  APEX_OPERATING = 'apex_operating',     // NOGALSS operational expenses
  LOAN_POOL = 'loan_pool',               // Aggregated loan capital across network
}

export enum CustodialAccountStatus {
  ACTIVE = 'active',
  FROZEN = 'frozen',
  CLOSED = 'closed',
}

/**
 * CustodialAccount â€“ Apex-level financial accounts managed exclusively by NOGALSS.
 * These are institutional accounts, NOT individual member wallets.
 * Tracks the Reserve Fund, Settlement Pool, Loan Capital Pool, etc.
 */
@Entity('custodial_accounts')
export class CustodialAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string; // e.g., "NOGALSS National Reserve Fund"

  @Column({ type: 'enum', enum: CustodialAccountType })
  type: CustodialAccountType;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  balance: number;

  @Column({ default: 'NGN' })
  currency: string;

  @Column({ type: 'enum', enum: CustodialAccountStatus, default: CustodialAccountStatus.ACTIVE })
  status: CustodialAccountStatus;

  @Column({ nullable: true })
  bankName: string; // External bank account details

  @Column({ nullable: true })
  bankAccountNumber: string;

  @Column({ nullable: true })
  bankAccountName: string;

  @Column({ nullable: true })
  sortCode: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ nullable: true })
  frozenBy: number; // FK to User

  @Column({ nullable: true, type: 'timestamp' })
  frozenAt: Date;

  @Column({ nullable: true, type: 'text' })
  freezeReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
