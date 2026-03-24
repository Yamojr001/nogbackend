import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Member } from './member.entity';
import { Product } from './product.entity';
import { Organisation } from './organisation.entity';

export enum ProductSubscriptionStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  SUSPENDED = 'suspended',
}

/**
 * ProductSubscription â€“ Tracks which member has subscribed to which product.
 * Links members to savings plans, loans, insurance, or services they are enrolled in.
 */
@Entity('product_subscriptions')
export class ProductSubscription {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Member)
  @JoinColumn()
  member: Member;

  @Column()
  memberId: number;

  @ManyToOne(() => Product)
  @JoinColumn()
  product: Product;

  @Column()
  productId: number;

  @ManyToOne(() => Organisation)
  @JoinColumn()
  organisation: Organisation;

  @Column()
  organisationId: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  amount: number; // Subscribed/enrolled amount

  @Column({ type: 'date', nullable: true })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @Column({ type: 'enum', enum: ProductSubscriptionStatus, default: ProductSubscriptionStatus.ACTIVE })
  status: ProductSubscriptionStatus;

  @Column({ nullable: true })
  enrolledBy: number; // FK to User (officer who enrolled)

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @CreateDateColumn()
  enrolledAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
