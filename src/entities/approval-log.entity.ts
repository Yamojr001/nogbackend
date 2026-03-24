import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Approval } from './approval.entity';
import { User } from './user.entity';

@Entity('approval_logs')
export class ApprovalLog {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Approval)
  request: Approval;

  @Column()
  requestId: number;

  @ManyToOne(() => User)
  actor: User;

  @Column()
  actorId: number;

  @Column()
  action: string; // e.g., 'approved', 'rejected', 'commented'

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  timestamp: Date;
}
