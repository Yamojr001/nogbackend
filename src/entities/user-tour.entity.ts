import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('user_tours')
export class UserTour {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;
 
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
 
  @Column({ name: 'tour_type', default: 'onboarding' })
  tourType: string;
 
  @Column({ name: 'is_completed', default: false })
  isCompleted: boolean;
 
  @Column({ name: 'last_step', default: 0 })
  lastStep: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
