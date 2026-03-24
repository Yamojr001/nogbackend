import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Branch } from './branch.entity';

export enum TargetMetric {
  COLLECTION = 'collection',
  LOAN_DISBURSEMENT = 'loan_disbursement',
  LOAN_REPAYMENT = 'loan_repayment',
  NEW_MEMBERS = 'new_members',
}

export enum TargetPeriod {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUAL = 'annual',
}

@Entity('branch_targets')
export class BranchTarget {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  targetAmount: number; // for financial metrics

  @Column({ nullable: true })
  targetCount: number; // for non-financial metrics (e.g., membership)

  @Column({ type: 'enum', enum: TargetMetric })
  metricType: TargetMetric;

  @Column({ type: 'enum', enum: TargetPeriod, default: TargetPeriod.MONTHLY })
  period: TargetPeriod;

  @Column()
  startDate: Date;

  @Column()
  endDate: Date;

  @ManyToOne(() => Branch)
  @JoinColumn()
  branch: Branch;

  @Column()
  branchId: number;

  @Column({ default: 'active' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
