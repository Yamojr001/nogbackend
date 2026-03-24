import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';
import { User } from './user.entity';

export enum VirtualAccountStatus {
  ACTIVE    = 'active',
  SUSPENDED = 'suspended',
  PENDING   = 'pending',
}

@Entity('user_virtual_accounts')
export class VirtualAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /** Paystack customer code, e.g. CUS_xxxxx */
  @Column({ nullable: true })
  paystackCustomerCode: string;

  /** Paystack dedicated account ID */
  @Column({ nullable: true })
  paystackAccountId: string;

  /** The assigned Nigerian bank account number */
  @Index({ unique: true })
  @Column({ nullable: true })
  accountNumber: string;

  /** Full name on the account */
  @Column({ nullable: true })
  accountName: string;

  /** Bank name, e.g. "Access Bank" */
  @Column({ nullable: true })
  bankName: string;

  /** Paystack bank slug, e.g. "access-bank" */
  @Column({ nullable: true })
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
  @Column({ type: 'json', nullable: true })
  rawPaystackResponse: object;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
