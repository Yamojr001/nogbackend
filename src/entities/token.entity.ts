import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('tokens')
export class Token {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  token: string;

  @Column({ default: false })
  isUsed: boolean;

  @Column({ nullable: true })
  payerName: string;

  @Column({ nullable: true })
  payerEmail: string;

  @Column({ nullable: true })
  payerPhone: string;

  @Column({ nullable: true })
  paymentReference: string;

  @Column({ nullable: true })
  usedByUserId: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  usedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
