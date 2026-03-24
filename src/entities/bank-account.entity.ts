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

  @Column()
  @Index()
  ownerId: number;

  @Column({ type: 'enum', enum: OwnerType })
  @Index()
  ownerType: OwnerType;

  @Column()
  accountName: string;

  @Column()
  bankName: string;

  @Column()
  accountNumber: string;

  @Column({ nullable: true, transformer: new EncryptionTransformer() })
  bvn: string; // To be encrypted

  @Column({ default: false })
  isVerified: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
