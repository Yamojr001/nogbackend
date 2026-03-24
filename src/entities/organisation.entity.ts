import { Entity, PrimaryGeneratedColumn, Column, OneToMany, Tree, TreeChildren, TreeParent, JoinColumn, OneToOne } from 'typeorm';
import { User } from './user.entity';

export enum OrganisationType {
  APEX = 'apex',
  PARTNER = 'partner',
  SUB_ORG = 'sub_org',
}

@Entity('organisation')
@Tree("adjacency-list")
export class Organisation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, nullable: true })
  code: string; // e.g., ORG-0001, SUB-0012, GRP-0345

  @Column()
  name: string;

  @Column({ nullable: true })
  acronym: string;

  @Column({ nullable: true })
  sector: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  regNumber: string; // CAC Registration Number

  @Column({
    type: 'enum',
    enum: OrganisationType,
    default: OrganisationType.SUB_ORG,
  })
  type: OrganisationType;

  @Column({ nullable: true })
  hqAddress: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true, type: 'text' })
  operatingStates: string;

  @Column({ default: 'pending' })
  kycStatus: string;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ default: 'active' })
  status: string;

  @Column({ nullable: true })
  representativeUserId: number;

  @OneToOne(() => User)
  @JoinColumn({ name: 'representativeUserId' })
  representative: User;

  @Column({ nullable: true })
  bankAccountId: number;

  @Column({ nullable: true })
  parentId: number;

  @TreeParent()
  @JoinColumn({ name: 'parentId' })
  parent: Organisation;

  @TreeChildren()
  children: Organisation[];

  @OneToMany(() => User, user => user.organisation)
  users: User[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
