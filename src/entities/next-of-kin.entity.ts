import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Member } from './member.entity';

@Entity('next_of_kin')
export class NextOfKin {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Member, member => member.nextOfKin)
  @JoinColumn()
  member: Member;

  @Column()
  memberId: number;

  @Column()
  name: string;

  @Column()
  relationship: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  email: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
