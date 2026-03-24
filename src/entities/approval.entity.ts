import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
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

@Entity()
export class Approval {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  requestType: string;

  @Column()
  referenceId: number; // e.g., loan id

  @ManyToOne(() => User)
  initiator: User;

  @Column()
  initiatorId: number;

  @Column({
    type: 'enum',
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING,
  })
  status: ApprovalStatus;

  @Column({ default: 1 })
  currentLevel: number; 

  @Column({ default: 3 })
  totalLevels: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;
}
