import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';

export enum SessionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  TERMINATED = 'terminated', // Force-logged-out by super admin
  TIMED_OUT = 'timed_out',
}

/**
 * AdminSession â€“ Tracks every admin login session for security auditing.
 * Supports IP logging, device fingerprinting, session duration, and forced logout.
 * Sessions are NEVER deleted â€” this is a regulatory-grade audit trail.
 */
@Entity('admin_sessions')
export class AdminSession {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn()
  user: User;

  @Column()
  userId: number;

  @Column()
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string; // Browser / device info

  @Column({ nullable: true })
  deviceFingerprint: string;

  @Column({ nullable: true })
  location: string; // City, Country derived from IP

  @Column({ type: 'enum', enum: SessionStatus, default: SessionStatus.ACTIVE })
  status: SessionStatus;

  @Column({ nullable: true, type: 'timestamp' })
  lastActiveAt: Date;

  @Column({ nullable: true, type: 'timestamp' })
  expiredAt: Date;

  @Column({ nullable: true })
  terminatedBy: number; // Admin user ID who forced the logout

  @Column({ nullable: true, type: 'text' })
  terminationReason: string;

  @Column({ default: false })
  isSuspicious: boolean; // Flagged by security monitoring

  @CreateDateColumn()
  loginAt: Date;
}
