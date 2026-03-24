import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { Member } from './member.entity';
import { Group } from './group.entity';
import { Branch } from './branch.entity';
import { Organisation } from './organisation.entity';

@Entity('contributions')
export class Contribution {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Member)
  member: Member;

  @Column()
  memberId: number;

  @ManyToOne(() => Group)
  group: Group;

  @Column({ nullable: true })
  groupId: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ default: 'cash' })
  paymentMethod: string;

  @Column({ default: 'completed' })
  status: string;

  @ManyToOne(() => Branch, { nullable: true })
  @JoinColumn()
  branch: Branch;

  @Column({ nullable: true })
  branchId: number;

  @ManyToOne(() => Organisation)
  @JoinColumn()
  organisation: Organisation;

  @Column()
  organisationId: number;

  @CreateDateColumn()
  date: Date;
}
