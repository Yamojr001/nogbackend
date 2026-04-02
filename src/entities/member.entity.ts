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

  @Column({ name: 'membership_id', unique: true, nullable: true })
  membershipId: string; 

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', nullable: true })
  userId: number;

  @Column({ nullable: true })
  gender: string;

  @Column({ name: 'date_of_birth', nullable: true, type: 'date' })
  dateOfBirth: Date;

  @Column({ name: 'marital_status', nullable: true })
  maritalStatus: string;

  @Column({ name: 'state_of_origin', nullable: true })
  stateOfOrigin: string;

  @Column({ nullable: true })
  nationality: string;

  @Column({ nullable: true, type: 'text' })
  address: string;

  @Column({ nullable: true })
  occupation: string;

  @Column({ name: 'educational_qualification', nullable: true })
  educationalQualification: string;

  // Organizational Affiliation (External)
  @Column({ name: 'ext_org_name', nullable: true })
  extOrgName: string;

  @Column({ name: 'ext_position', nullable: true })
  extPosition: string;

  @Column({ name: 'ext_state_chapter', nullable: true })
  extStateChapter: string;

  @Column({ name: 'kyc_status', default: 'pending' })
  kycStatus: string;

  @OneToOne(() => NextOfKin, nok => nok.member)
  @JoinColumn({ name: 'next_of_kin_id' })
  nextOfKin: NextOfKin;

  @Column({ name: 'next_of_kin_id', nullable: true })
  nextOfKinId: number;

  @OneToOne(() => Wallet)
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;

  @Column({ name: 'wallet_id', nullable: true })
  walletId: number;

  @Column({ name: 'contribution_balance', type: 'decimal', precision: 15, scale: 2, default: 0 })
  contributionBalance: number;

  @Column({ name: 'savings_frequency', nullable: true })
  savingsFrequency: string; 

  @Column({ name: 'proposed_savings_amount', type: 'decimal', precision: 15, scale: 2, nullable: true })
  proposedSavingsAmount: number;

  @Column({ name: 'empowerment_interest', nullable: true })
  empowermentInterest: string; 

  @Column({ name: 'loan_status', default: 'none' })
  loanStatus: string;

  @CreateDateColumn({ name: 'joined_date' })
  joinedDate: Date;

  @ManyToOne(() => Branch, { nullable: true })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @Column({ name: 'branch_id', nullable: true })
  branchId: number;

  @ManyToOne(() => Group, { nullable: true })
  @JoinColumn({ name: 'group_id' })
  group: Group;

  @Column({ name: 'group_id', nullable: true })
  groupId: number;

  @ManyToOne(() => Organisation)
  @JoinColumn({ name: 'organization_id' })
  organisation: Organisation;

  @Column({ name: 'organization_id', nullable: true })
  organisationId: number;

  @Column({ name: 'sub_org_id', nullable: true })
  subOrgId: number;

  @Column({ name: 'registration_officer_id', nullable: true })
  registrationOfficerId: number;

  @Column({ name: 'is_registration_fee_paid', default: false })
  isRegistrationFeePaid: boolean;

  @Column({ name: 'payment_reference', nullable: true })
  paymentReference: string;

  @Column({ default: 'active' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
