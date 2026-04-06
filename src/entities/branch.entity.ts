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

  @Column({ unique: true, nullable: true })
  code: string; 

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
  @JoinColumn({ name: 'organisation_id' })
  organisation: Organisation;

  @Column({ name: 'organisation_id', nullable: true })
  organisationId: number;

  @Column({ default: 'active' }) // active | suspended | closed
  status: string;

  @Column({ name: 'manager_id', nullable: true })
  managerId: number; // FK to User (Branch Manager)

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
