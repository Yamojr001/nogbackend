import { Entity, PrimaryGeneratedColumn, Column, OneToOne, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { Group } from './group.entity';
import { Wallet } from './wallet.entity';
import { Branch } from './branch.entity';
import { NextOfKin } from './next-of-kin.entity';
import { Organisation } from './organisation.entity';

@Entity('members')
export class Member {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, nullable: true })
  membershipId: string; // e.g., NOG-MEM-2026-0001

  @OneToOne(() => User)
  @JoinColumn()
  user: User;

  @Column({ nullable: true })
  userId: number;

  @Column({ nullable: true })
  gender: string;

  @Column({ nullable: true, type: 'date' })
  dateOfBirth: Date;

  @Column({ nullable: true })
  maritalStatus: string;

  @Column({ nullable: true })
  stateOfOrigin: string;

  @Column({ nullable: true })
  nationality: string;

  @Column({ nullable: true, type: 'text' })
  address: string;

  @Column({ nullable: true })
  occupation: string;

  @Column({ nullable: true })
  educationalQualification: string;

  // Organizational Affiliation (External)
  @Column({ nullable: true })
  extOrgName: string;

  @Column({ nullable: true })
  extPosition: string;

  @Column({ nullable: true })
  extStateChapter: string;

  @Column({ default: 'pending' })
  kycStatus: string;

  @OneToOne(() => NextOfKin, nok => nok.member)
  nextOfKin: NextOfKin;

  @Column({ nullable: true })
  nextOfKinId: number;

  @OneToOne(() => Wallet)
  @JoinColumn()
  wallet: Wallet;

  @Column({ nullable: true })
  walletId: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  contributionBalance: number;

  @Column({ nullable: true })
  savingsFrequency: string; // Daily, Weekly, Monthly

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  proposedSavingsAmount: number;

  @Column({ nullable: true })
  empowermentInterest: string; // Agriculture, ICT, etc.

  @Column({ default: 'none' })
  loanStatus: string;

  @CreateDateColumn()
  joinedDate: Date;

  @ManyToOne(() => Branch, { nullable: true })
  @JoinColumn()
  branch: Branch;

  @Column({ nullable: true })
  branchId: number;

  @ManyToOne(() => Group, { nullable: true })
  @JoinColumn()
  group: Group;

  @Column({ nullable: true })
  groupId: number;

  @ManyToOne(() => Organisation)
  @JoinColumn()
  organisation: Organisation;

  @Column({ nullable: true })
  organisationId: number;

  @Column({ nullable: true })
  subOrgId: number;

  @Column({ nullable: true })
  registrationOfficerId: number;

  @Column({ default: 'active' })
  status: string;
}
