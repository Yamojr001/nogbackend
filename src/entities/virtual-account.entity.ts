import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';
import { User } from './user.entity';
import { Organisation } from './organisation.entity';

export enum VirtualAccountStatus {
  ACTIVE    = 'active',
  SUSPENDED = 'suspended',
  PENDING   = 'pending',
}

@Entity('virtual_accounts')
export class VirtualAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'user_id', nullable: true })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index()
  @Column({ name: 'organisation_id', nullable: true })
  organisationId: number;

  @ManyToOne(() => Organisation, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'organisation_id' })
  organisation: Organisation;

  /** Paystack customer code, e.g. CUS_xxxxx */
  @Column({ name: 'paystack_customer_code', nullable: true })
  paystackCustomerCode: string;

  /** Paystack dedicated account ID */
  @Column({ name: 'paystack_account_id', nullable: true })
  paystackAccountId: string;

  /** Parallex virtual account reference/ID */
  @Column({ name: 'parallex_account_id', nullable: true })
  parallexAccountId: string;

  /** The assigned Nigerian bank account number */
  @Index({ unique: true })
  @Column({ name: 'account_number', nullable: true })
  accountNumber: string;

  /** Full name on the account */
  @Column({ name: 'account_name', nullable: true })
  accountName: string;

  /** Bank name, e.g. "Access Bank" */
  @Column({ name: 'bank_name', nullable: true })
  bankName: string;

  /** Paystack bank slug, e.g. "access-bank" */
  @Column({ name: 'bank_slug', nullable: true })
  bankSlug: string;

  @Column({ default: 'NGN' })
  currency: string;

  @Column({
    type: 'enum',
    enum: VirtualAccountStatus,
    default: VirtualAccountStatus.PENDING,
  })
  status: VirtualAccountStatus;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  balance: number;

  /** Raw Paystack response stored for debugging */
  @Column({ name: 'raw_paystack_response', type: 'json', nullable: true })
  rawPaystackResponse: object;

  /** Raw Parallex response stored for debugging */
  @Column({ name: 'raw_parallex_response', type: 'json', nullable: true })
  rawParallexResponse: object;

  @Column({ name: 'gateway', nullable: true, default: 'paystack' })
  gateway: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
