import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from './user.entity';
import { Organisation } from './organisation.entity';

export enum WalletType {
  MEMBER = 'member',
  GROUP = 'group',
  SUB_ORG = 'sub_org',
  PARTNER = 'partner',
  SYSTEM = 'system',
}

@Entity()
export class Wallet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: WalletType,
  })
  type: WalletType;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  balance: number;

  @Column({ default: 'NGN' })
  currency: string;

  @Column({ default: 'active' })
  status: string;

  @Column({ nullable: true })
  ownerId: number;

  @Column({ type: 'enum', enum: WalletType, nullable: true })
  ownerType: WalletType;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
