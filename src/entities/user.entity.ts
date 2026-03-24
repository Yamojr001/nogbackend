import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Organisation } from './organisation.entity';
import { Wallet } from './wallet.entity';
import { Loan } from './loan.entity';
import { Member } from './member.entity';
import { Branch } from './branch.entity';
import { EncryptionTransformer } from '../common/encryption.transformer';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  FINANCE_ADMIN = 'finance_admin',
  AUDITOR = 'auditor',
  PARTNER_ADMIN = 'partner_admin',
  PARTNER_OFFICER = 'partner_officer',
  SUB_ORG_ADMIN = 'sub_org_admin',
  SUB_ORG_OFFICER = 'sub_org_officer',
  FINANCE_OFFICER = 'finance_officer',
  GROUP_ADMIN = 'group_admin',
  GROUP_TREASURER = 'group_treasurer',
  GROUP_SECRETARY = 'group_secretary',
  MEMBER = 'member',
  SUPPORT_AGENT = 'support_agent',
  APEX_ADMIN = 'apex_admin',
}

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ nullable: true })
  name: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  googleId: string;

  @Column({ default: 'pending' })
  status: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.MEMBER,
  })
  role: UserRole;

  @Column({ type: 'json', nullable: true })
  notificationSettings: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };

  @OneToOne(() => Member, member => member.user)
  memberProfile: Member;

  @ManyToOne(() => Organisation, organisation => organisation.users)
  organisation: Organisation;

  @ManyToOne(() => Branch, { nullable: true })
  @JoinColumn()
  branch: Branch;

  @Column({ nullable: true })
  branchId: number;

  @OneToMany(() => Loan, loan => loan.member)
  loans: Loan[];

  @Column({ nullable: true, transformer: new EncryptionTransformer() })
  nin: string;

  @Column({ nullable: true, transformer: new EncryptionTransformer() })
  bvn: string;

  @Column({ nullable: true })
  refreshTokenHash: string;

  @Column({ default: false })
  needsCaptcha: boolean;

  @Column({ nullable: true })
  resetToken: string;

  @Column({ type: 'timestamp', nullable: true })
  resetTokenExpires: Date;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ nullable: true })
  paystackCustomerCode: string;

  @Column({ default: 0 })
  failedLoginAttempts: number;

  @Column({ type: 'timestamp', nullable: true })
  lockUntil: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
