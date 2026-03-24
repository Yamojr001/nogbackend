import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Loan } from './loan.entity';
import { Member } from './member.entity';

export enum RepaymentStatus {
  SCHEDULED = 'scheduled',   // Future installment
  DUE = 'due',               // Due today
  PAID = 'paid',             // Fully paid on time
  OVERDUE = 'overdue',       // Missed due date
  PARTIALLY_PAID = 'partially_paid',
  WAIVED = 'waived',         // Waived by admin
}

/**
 * RepaymentSchedule â€“ Installment-level loan repayment plan.
 * When a loan is approved, a full schedule of installments is auto-generated.
 * Each installment tracks due date, expected amount, actual payment, and status.
 */
@Entity('repayment_schedules')
export class RepaymentSchedule {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Loan)
  @JoinColumn()
  loan: Loan;

  @Column()
  loanId: number;

  @ManyToOne(() => Member)
  @JoinColumn()
  member: Member;

  @Column()
  memberId: number;

  @Column()
  installmentNumber: number; // 1, 2, 3... (month of repayment)

  @Column({ type: 'date' })
  dueDate: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  principalDue: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  interestDue: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  totalDue: number; // principal + interest

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  amountPaid: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  penalty: number; // Late payment penalty

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  balance: number; // Outstanding balance after partial/full payment

  @Column({ type: 'enum', enum: RepaymentStatus, default: RepaymentStatus.SCHEDULED })
  status: RepaymentStatus;

  @Column({ nullable: true, type: 'timestamp' })
  paidAt: Date;

  @Column({ nullable: true })
  paidBy: number; // FK to User (officer who recorded payment)

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
