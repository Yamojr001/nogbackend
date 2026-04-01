import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, JoinColumn } from 'typeorm';
import { Organisation } from './organisation.entity';
import { User } from './user.entity';
import { Branch } from './branch.entity';

@Entity('groups')
export class Group {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @ManyToOne(() => Organisation)
  subOrg: Organisation;

  @Column({ nullable: true })
  subOrgId: number;

  @ManyToOne(() => Branch, { nullable: true })
  @JoinColumn()
  branch: Branch;

  @Column({ nullable: true })
  branchId: number;

  @ManyToOne(() => User)
  leader: User;

  @Column({ nullable: true })
  leaderId: number;

  @Column({ nullable: true })
  category: string;

  @Column({ default: 'active' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;
}
