import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Branch } from './branch.entity';
import { Organisation } from './organisation.entity';
import { User } from './user.entity';

@Entity('branch_expenses')
export class BranchExpense {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column()
  category: string; // e.g., "Office Supplies", "Fuel", "Logistics"

  @Column({ type: 'text', nullable: true })
  description: string;

  @ManyToOne(() => Branch)
  @JoinColumn()
  branch: Branch;

  @Column()
  branchId: number;

  @ManyToOne(() => Organisation)
  @JoinColumn()
  organisation: Organisation;

  @Column()
  organisationId: number;

  @ManyToOne(() => User)
  @JoinColumn()
  recordedBy: User;

  @Column()
  recordedById: number;

  @Column({ default: 'approved' }) // approved | pending | rejected
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
