import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Wallet } from './wallet.entity';

export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  TRANSFER = 'transfer',
  LOAN_DISBURSEMENT = 'loan_disbursement',
  LOAN_REPAYMENT = 'loan_repayment',
  CONTRIBUTION = 'contribution',
}

@Entity()
export class Ledger {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Wallet, { nullable: true })
  sourceWallet: Wallet;

  @ManyToOne(() => Wallet, { nullable: true })
  destinationWallet: Wallet;

  @Column()
  type: string; // Using string to support the expanded enum values easily

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  sourceBalanceAfter: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  destinationBalanceAfter: number;

  @Column({ nullable: true })
  description: string;

  @Column({ default: 'completed' })
  status: string;

  @Column({ nullable: true })
  reference: string;

  @Column({ nullable: true })
  transactionId: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
