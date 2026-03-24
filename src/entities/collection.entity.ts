import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { Group } from './group.entity';
import { Branch } from './branch.entity';
import { Organisation } from './organisation.entity';

export enum CollectionStatus {
  PENDING_SYNC = 'pending_sync',
  SYNCED = 'synced',
  CANCELLED = 'cancelled',
}

@Entity('collections')
export class Collection {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @ManyToOne(() => User)
  @JoinColumn()
  officer: User;

  @Column()
  officerId: number;

  @ManyToOne(() => Group, { nullable: true })
  @JoinColumn()
  group: Group;

  @Column({ nullable: true })
  groupId: number;

  @ManyToOne(() => Branch)
  @JoinColumn()
  branch: Branch;

  @Column()
  branchId: number;

  @ManyToOne(() => Organisation)
  @JoinColumn()
  organisation: Organisation;

  @Column()
  organisationId: number;

  @Column({
    type: 'enum',
    enum: CollectionStatus,
    default: CollectionStatus.PENDING_SYNC,
  })
  status: CollectionStatus;

  @Column({ nullable: true })
  syncReference: string; // Reference to the transaction created upon sync

  @CreateDateColumn()
  collectedAt: Date;

  @Column({ nullable: true, type: 'timestamp' })
  syncedAt: Date;
}
