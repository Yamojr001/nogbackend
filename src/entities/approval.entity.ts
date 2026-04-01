import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  EXECUTED = 'executed',
  REJECTED = 'rejected',
}

export enum ApprovalType {
  LOAN = 'loan',
  WITHDRAWAL = 'withdrawal',
  TRANSFER = 'transfer',
}

@Entity('approvals')
export class Approval {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'request_type' })
  requestType: string;

  @Column({ name: 'reference_id' })
  referenceId: number; 

  @ManyToOne(() => User)
  @JoinColumn({ name: 'initiator_id' })
  initiator: User;

  @Column({ name: 'initiator_id' })
  initiatorId: number;

  @Column({
    type: 'enum',
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING,
  })
  status: ApprovalStatus;

  @Column({ name: 'current_level', default: 1 })
  currentLevel: number; 

  @Column({ name: 'total_levels', default: 3 })
  totalLevels: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt: Date;
}
