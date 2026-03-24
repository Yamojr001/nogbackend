import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { Loan } from './loan.entity';
import { Branch } from './branch.entity';
import { Organisation } from './organisation.entity';

@Entity('loan_repayments')
export class LoanRepayment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Loan)
  loan: Loan;

  @Column()
  loanId: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @CreateDateColumn()
  paidAt: Date;

  @Column({ default: 'bank_transfer' })
  method: string;

  @Column({ default: 'completed' })
  status: string;

  @ManyToOne(() => Branch, { nullable: true })
  @JoinColumn()
  branch: Branch;

  @Column({ nullable: true })
  branchId: number;

  @ManyToOne(() => Organisation)
  @JoinColumn()
  organisation: Organisation;

  @Column()
  organisationId: number;
}
