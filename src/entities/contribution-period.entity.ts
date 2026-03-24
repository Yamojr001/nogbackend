import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Organisation } from './organisation.entity';
import { Group } from './group.entity';

export enum PeriodStatus {
  OPEN = 'open',         // Currently accepting contributions
  CLOSED = 'closed',     // Contribution window has passed
  SETTLED = 'settled',   // All contributions processed and distributed
}

/**
 * ContributionPeriod â€“ Defines a scheduled contribution cycle (e.g., monthly savings period).
 * Each period tracks expected vs actual contributions across all members.
 */
@Entity('contribution_periods')
export class ContributionPeriod {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string; // e.g., "March 2026 Monthly Contribution"

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  targetAmountPerMember: number;

  @ManyToOne(() => Organisation)
  @JoinColumn()
  organisation: Organisation;

  @Column()
  organisationId: number;

  @ManyToOne(() => Group, { nullable: true })
  @JoinColumn()
  group: Group;

  @Column({ nullable: true })
  groupId: number; // If null, applies org-wide

  @Column({ type: 'enum', enum: PeriodStatus, default: PeriodStatus.OPEN })
  status: PeriodStatus;

  @Column({ default: false })
  penaltyApplied: boolean; // Whether late/missed penalties have been applied

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
