import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Member } from './member.entity';
import { Meeting } from './meeting.entity';

@Entity('attendance')
export class Attendance {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Meeting)
  @JoinColumn()
  meeting: Meeting;

  @Column()
  meetingId: number;

  @ManyToOne(() => Member)
  @JoinColumn()
  member: Member;

  @Column()
  memberId: number;

  @Column({ default: 'present' }) // present, absent, excused
  status: string;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  @CreateDateColumn()
  timestamp: Date;
}
