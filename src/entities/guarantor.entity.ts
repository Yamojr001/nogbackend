import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Member } from './member.entity';
import { Loan } from './loan.entity';

@Entity('guarantors')
export class Guarantor {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Loan)
  @JoinColumn()
  loan: Loan;

  @Column()
  loanId: number;

  @ManyToOne(() => Member)
  @JoinColumn()
  member: Member;

  @Column()
  memberId: number;

  @Column({ default: 'pending' })
  status: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  guaranteeAmount: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;
}
