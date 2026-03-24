import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum ProgramCategory {
  AGRICULTURE = 'agriculture',
  MSME = 'msme',
  TRANSPORT = 'transport',
  HOUSING = 'housing',
  ARTISAN = 'artisan',
  ASSET_FINANCING = 'asset_financing',
  ICT = 'ict',
  TRADE = 'trade',
  HEALTH = 'health',
  EDUCATION = 'education',
}

@Entity('empowerment_programs')
export class EmpowermentProgram {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: ProgramCategory })
  category: ProgramCategory;

  @Column()
  subProgram: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  eligibilityRules: string;

  @Column()
  fundingType: string; // e.g., 'Cash', 'Asset'

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  budgetAllocated: number;

  @Column({ default: 0 })
  availableSlots: number;

  @Column({ type: 'date', nullable: true })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @Column({ default: true })
  adminApprovalRequired: boolean;

  @Column()
  createdBy: number; // ApexAdmin UserID

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
