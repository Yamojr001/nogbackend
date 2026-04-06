import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { Organisation } from './organisation.entity';

export enum WalletType {
  MEMBER = 'member',
  GROUP = 'group',
  SUB_ORG = 'sub_org',
  PARTNER = 'partner',
  SYSTEM = 'system',
}

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  balance: number;

  @Column({ default: 'NGN' })
  currency: string;

  @Column({ default: 'active' })
  status: string;

  @Column({ name: 'owner_id', nullable: true })
  ownerId: number;

  @Column({ name: 'owner_type', type: 'enum', enum: WalletType, nullable: true })
  ownerType: WalletType;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
