import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { EncryptionTransformer } from '../common/encryption.transformer';

export enum OwnerType {
  MEMBER = 'member',
  ORGANISATION = 'organisation',
}

@Entity('bank_accounts')
export class BankAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'owner_id' })
  @Index()
  ownerId: number;

  @Column({ name: 'owner_type', type: 'enum', enum: OwnerType })
  @Index()
  ownerType: OwnerType;

  @Column({ name: 'account_name' })
  accountName: string;

  @Column({ name: 'bank_name' })
  bankName: string;

  @Column({ name: 'account_number' })
  accountNumber: string;

  @Column({ nullable: true, transformer: new EncryptionTransformer() })
  bvn: string; // To be encrypted

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
