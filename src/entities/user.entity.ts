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

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'first_name', nullable: true })
  firstName: string;

  @Column({ name: 'last_name', nullable: true })
  lastName: string;

  @Column({ nullable: true })
  name: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column()
  password: string;

  @Column({ name: 'google_id', nullable: true })
  googleId: string;

  @Column({ default: 'pending' })
  status: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.MEMBER,
  })
  role: UserRole;

  @Column({ name: 'notification_settings', type: 'json', nullable: true })
  notificationSettings: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };

  @OneToOne(() => Member, member => member.user)
  memberProfile: Member;

  @ManyToOne(() => Organisation, organisation => organisation.users)
  @JoinColumn({ name: 'organization_id' })
  organisation: Organisation;

  @Column({ name: 'organization_id', nullable: true })
  organisationId: number;

  @ManyToOne(() => Branch, { nullable: true })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @Column({ name: 'branch_id', nullable: true })
  branchId: number;

  @OneToMany(() => Loan, loan => loan.member)
  loans: Loan[];

  @Column({ nullable: true, transformer: new EncryptionTransformer() })
  nin: string;

  @Column({ nullable: true, transformer: new EncryptionTransformer() })
  bvn: string;

  @Column({ name: 'refresh_token_hash', nullable: true })
  refreshTokenHash: string;

  @Column({ name: 'needs_captcha', default: false })
  needsCaptcha: boolean;

  @Column({ name: 'reset_token', nullable: true })
  resetToken: string;

  @Column({ name: 'reset_token_expires', type: 'timestamp', nullable: true })
  resetTokenExpires: Date;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @Column({ name: 'paystack_customer_code', nullable: true })
  paystackCustomerCode: string;

  @Column({ name: 'failed_login_attempts', default: 0 })
  failedLoginAttempts: number;

  @Column({ name: 'lock_until', type: 'timestamp', nullable: true })
  lockUntil: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
