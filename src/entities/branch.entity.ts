import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Organisation } from './organisation.entity';

/**
 * Branch â€“ A physical/geographical branch under a Partner Organisation.
 * Each Partner can have multiple branches, each with their own groups, members, and staff.
 */
@Entity('branches')
export class Branch {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string; // e.g., "Abuja Branch"

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @ManyToOne(() => Organisation)
  @JoinColumn()
  organisation: Organisation;

  @Column()
  organisationId: number;

  @Column({ default: 'active' }) // active | suspended | closed
  status: string;

  @Column({ nullable: true })
  managerId: number; // FK to User (Branch Manager)

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
