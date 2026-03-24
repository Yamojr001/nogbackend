import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { Organisation } from './organisation.entity';

export enum ReportType {
  FINANCIAL_STATEMENT = 'financial_statement',
  LOAN_PORTFOLIO = 'loan_portfolio',
  MEMBER_GROWTH = 'member_growth',
  REPAYMENT_PERFORMANCE = 'repayment_performance',
  ORGANISATION_KPI = 'organisation_kpi',
  AUDIT_TRAIL = 'audit_trail',
  COMPLIANCE = 'compliance',
  SETTLEMENT_SUMMARY = 'settlement_summary',
  SYSTEM_ACTIVITY = 'system_activity',
}

export enum ReportStatus {
  GENERATING = 'generating',
  READY = 'ready',
  FAILED = 'failed',
  EXPIRED = 'expired', // Older than retention period (e.g., 90 days)
}

export enum ReportFormat {
  PDF = 'pdf',
  CSV = 'csv',
  EXCEL = 'excel',
  JSON = 'json',
}

/**
 * ReportExport â€“ Archive of all generated reports for the admin and partner portals.
 * Supports on-demand and scheduled generation. Each record links to the stored file.
 */
@Entity('report_exports')
export class ReportExport {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string; // e.g., "Financial Statement â€“ March 2026"

  @Column({ type: 'enum', enum: ReportType })
  type: ReportType;

  @Column({ type: 'enum', enum: ReportFormat, default: ReportFormat.PDF })
  format: ReportFormat;

  @Column({ type: 'enum', enum: ReportStatus, default: ReportStatus.GENERATING })
  status: ReportStatus;

  @ManyToOne(() => Organisation, { nullable: true })
  @JoinColumn()
  organisation: Organisation;

  @Column({ nullable: true })
  organisationId: number; // null = apex-wide report

  @ManyToOne(() => User)
  @JoinColumn()
  requestedByUser: User;

  @Column()
  requestedBy: number;

  @Column({ nullable: true })
  fileUrl: string; // Storage path of generated file

  @Column({ nullable: true })
  fileSizeBytes: number;

  @Column({ nullable: true, type: 'date' })
  periodStart: Date; // Reporting period start

  @Column({ nullable: true, type: 'date' })
  periodEnd: Date;   // Reporting period end

  @Column({ nullable: true, type: 'json' })
  filters: Record<string, any>; // Report filter parameters

  @Column({ nullable: true, type: 'timestamp' })
  completedAt: Date;

  @Column({ nullable: true, type: 'timestamp' })
  expiresAt: Date; // When the file will be purged

  @Column({ nullable: true, type: 'text' })
  errorMessage: string; // If FAILED

  @Column({ default: false })
  isScheduled: boolean;

  @Column({ nullable: true })
  scheduleFrequency: string; // e.g., 'monthly', 'weekly'

  @CreateDateColumn()
  requestedAt: Date;
}
