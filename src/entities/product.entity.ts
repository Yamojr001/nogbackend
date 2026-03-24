import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Organisation } from './organisation.entity';

export enum ProductType {
  SAVINGS = 'savings',
  LOAN = 'loan',
  INSURANCE = 'insurance',
  SERVICE = 'service',
}

export enum ProductStatus {
  ACTIVE = 'active',
  DRAFT = 'draft',
  SUSPENDED = 'suspended',
  ARCHIVED = 'archived',
}

/**
 * Product â€“ A cooperative financial product or service offered by a Partner Organisation.
 * Examples: Monthly Savings Plan, Emergency Loan, Business Loan, Group Insurance.
 */
@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: ProductType, default: ProductType.SAVINGS })
  type: ProductType;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  interestRate: number; // Annual % rate

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  minAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  maxAmount: number;

  @Column({ nullable: true })
  minTenureMonths: number;

  @Column({ nullable: true })
  maxTenureMonths: number;

  @Column({ nullable: true, type: 'text' })
  eligibilityCriteria: string;

  @Column({ nullable: true })
  minMembershipMonths: number; // Min months as member to qualify

  @Column({ default: true })
  requiresKyc: boolean;

  @Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.DRAFT })
  status: ProductStatus;

  @ManyToOne(() => Organisation)
  @JoinColumn()
  organisation: Organisation;

  @Column()
  organisationId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
