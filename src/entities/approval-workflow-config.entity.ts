import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Organisation } from './organisation.entity';
import { User } from './user.entity';

export enum WorkflowType {
  LOAN_APPROVAL = 'loan_approval',
  WITHDRAWAL = 'withdrawal',
  FUND_DISBURSEMENT = 'fund_disbursement',
  MEMBER_REGISTRATION = 'member_registration',
  ORGANISATION_ONBOARDING = 'organisation_onboarding',
  SETTLEMENT = 'settlement',
  PRODUCT_LAUNCH = 'product_launch',
}

export enum WorkflowScope {
  APEX = 'apex',           // Applies to all orgs (set by Super Admin)
  PARTNER = 'partner',     // Applies within one Partner org
}

/**
 * ApprovalWorkflowConfig â€“ Defines the multi-level approval rules for each transaction type.
 * Example: Loans above â‚¦500,000 require Finance Admin â†’ Apex Super Admin (2-step).
 * This table drives the entire Approval Workflow Engine.
 */
@Entity('approval_workflow_configs')
export class ApprovalWorkflowConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: WorkflowType })
  workflowType: WorkflowType;

  @Column({ type: 'enum', enum: WorkflowScope, default: WorkflowScope.APEX })
  scope: WorkflowScope;

  @ManyToOne(() => Organisation, { nullable: true })
  @JoinColumn()
  organisation: Organisation;

  @Column({ nullable: true })
  organisationId: number; // null = global apex rule

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  minAmount: number; // Rule applies when amount >= minAmount

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  maxAmount: number; // Rule applies when amount < maxAmount (null = no limit)

  @Column({ type: 'int', default: 1 })
  levelCount: number; // Total approval levels required (1, 2, or 3)

  @Column({ type: 'json', nullable: true })
  levels: {
    level: number;
    requiredRole: string;
    label: string;
  }[]; // e.g., [{level:1, requiredRole:'finance_admin', label:'Finance Review'}, ...]

  @Column({ default: true })
  autoEscalate: boolean; // Auto-escalate if not actioned within SLA

  @Column({ nullable: true })
  escalationHours: number; // Hours before auto-escalation

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true, type: 'text' })
  description: string;

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
