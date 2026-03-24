import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Organisation } from './organisation.entity';
import { User } from './user.entity';

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
  RESOLVED = 'resolved',
}

export enum AlertType {
  SUSPICIOUS_LOGIN = 'suspicious_login',
  LARGE_TRANSACTION = 'large_transaction',
  FAILED_SETTLEMENT = 'failed_settlement',
  KYC_EXPIRY = 'kyc_expiry',
  LOAN_DEFAULT = 'loan_default',
  ACCOUNT_FREEZE = 'account_freeze',
  SYSTEM_ERROR = 'system_error',
  COMPLIANCE_BREACH = 'compliance_breach',
  ORG_SUSPENSION = 'org_suspension',
  APPROVAL_OVERDUE = 'approval_overdue',
}

/**
 * SystemAlert â€“ Platform-wide alerts generated automatically or manually.
 * Displayed on admin dashboards. Classified by severity and type.
 * Can be resolved, escalated, or assigned.
 */
@Entity('system_alerts')
export class SystemAlert {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: AlertType })
  type: AlertType;

  @Column({ type: 'enum', enum: AlertSeverity, default: AlertSeverity.INFO })
  severity: AlertSeverity;

  @Column()
  title: string;

  @Column({ type: 'text' })
  message: string;

  @ManyToOne(() => Organisation, { nullable: true })
  @JoinColumn()
  organisation: Organisation;

  @Column({ nullable: true })
  organisationId: number; // If alert is org-specific

  @Column({ nullable: true })
  relatedEntityType: string; // e.g., 'transaction', 'member', 'loan'

  @Column({ nullable: true })
  relatedEntityId: number;   // ID of the related entity

  @Column({ default: false })
  isRead: boolean;

  @Column({ default: false })
  isResolved: boolean;

  @Column({ nullable: true })
  resolvedBy: number; // FK to User

  @Column({ nullable: true, type: 'timestamp' })
  resolvedAt: Date;

  @Column({ nullable: true, type: 'text' })
  resolutionNote: string;

  @Column({ nullable: true })
  assignedTo: number; // FK to User (admin who should handle)

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
