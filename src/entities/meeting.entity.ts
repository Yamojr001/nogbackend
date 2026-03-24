import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Group } from './group.entity';
import { Branch } from './branch.entity';

@Entity('meetings')
export class Meeting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'timestamp' })
  date: Date;

  @Column({ nullable: true })
  location: string;

  @ManyToOne(() => Group, { nullable: true })
  @JoinColumn()
  group: Group;

  @Column({ nullable: true })
  groupId: number;

  @ManyToOne(() => Branch, { nullable: true })
  @JoinColumn()
  branch: Branch;

  @Column({ nullable: true })
  branchId: number;

  @Column({ default: 'scheduled' }) // scheduled, completed, cancelled
  status: string;

  @CreateDateColumn()
  createdAt: Date;
}
