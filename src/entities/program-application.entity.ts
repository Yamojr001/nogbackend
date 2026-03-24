import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { EmpowermentProgram } from './empowerment-program.entity';

export enum ApplicationStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('program_applications')
export class ProgramApplication {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  applicantId: number; // Member or Org UserID

  @Column()
  applicantType: string; // 'member' or 'organisation'

  @ManyToOne(() => EmpowermentProgram)
  @JoinColumn()
  program: EmpowermentProgram;

  @Column()
  programId: number;

  @Column({ type: 'json', nullable: true })
  documentsSubmitted: any; // List of file URLs or metadata

  @Column({ type: 'json', nullable: true })
  approvalFlowHistory: any; // [{level: 1, approverId: 10, status: 'approved', comment: 'Looks good'}]

  @Column({ type: 'enum', enum: ApplicationStatus, default: ApplicationStatus.PENDING })
  status: ApplicationStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
