import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Wallet } from './wallet.entity';

export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  TRANSFER = 'transfer',
  LOAN_DISBURSEMENT = 'loan_disbursement',
  LOAN_REPAYMENT = 'loan_repayment',
  CONTRIBUTION = 'contribution',
}

@Entity('ledgers')
export class Ledger {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Wallet, { nullable: true })
  @JoinColumn({ name: 'source_wallet_id' })
  sourceWallet: Wallet;

  @Column({ name: 'source_wallet_id', nullable: true })
  sourceWalletId: number;

  @ManyToOne(() => Wallet, { nullable: true })
  @JoinColumn({ name: 'destination_wallet_id' })
  destinationWallet: Wallet;

  @Column({ name: 'destination_wallet_id', nullable: true })
  destinationWalletId: number;

  @Column()
  type: string; 

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ name: 'source_balance_after', type: 'decimal', precision: 15, scale: 2, nullable: true })
  sourceBalanceAfter: number;

  @Column({ name: 'destination_balance_after', type: 'decimal', precision: 15, scale: 2, nullable: true })
  destinationBalanceAfter: number;

  @Column({ nullable: true })
  description: string;

  @Column({ default: 'completed' })
  status: string;

  @Column({ nullable: true })
  reference: string;

  @Column({ name: 'transaction_id', nullable: true })
  transactionId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
