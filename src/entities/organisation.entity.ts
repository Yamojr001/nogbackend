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
  establishmentDate: Date;

  @Column({ nullable: true })
  orgTypeStr: string; // Cooperative, NGO, etc.

  @Column({ nullable: true })
  activeMemberCount: number;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true, type: 'text' })
  operatingStates: string;

  // --- SECTION B & C: REPRESENTATIVE ---
  @Column({ nullable: true })
  repName: string;

  @Column({ nullable: true })
  repPosition: string;

  @Column({ nullable: true })
  repPhone: string;

  @Column({ nullable: true })
  repEmail: string;

  @Column({ nullable: true })
  repGender: string;

  @Column({ nullable: true })
  repNationality: string;

  @Column({ nullable: true })
  repStateOfOrigin: string;

  @Column({ nullable: true })
  repLga: string;

  @Column({ nullable: true })
  repNin: string;

  @Column({ nullable: true })
  repBvn: string;

  @Column({ nullable: true })
  repIdType: string;

  @Column({ nullable: true })
  repIdUrl: string;

  @Column({ nullable: true })
  repPassportUrl: string;

  // --- SECTION D: SAVINGS & ENGAGEMENT ---
  @Column({ default: false })
  participateInSavings: boolean;

  @Column({ nullable: true })
  savingsFrequency: string; // Monthly, Quarterly, Annually

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  monthlyContributionAmount: number;

  @Column({ type: 'text', nullable: true })
  areasOfParticipation: string; // JSON string: Loans, Training, etc.

  @Column({ nullable: true })
  proposedBeneficiaries: number;

  // --- SECTION E: ORG BANK DETAILS ---
  @Column({ nullable: true })
  orgAccountName: string;

  @Column({ nullable: true })
  orgBankName: string;

  @Column({ nullable: true })
  orgAccountNumber: string;

  @Column({ nullable: true })
  orgBvn: string;

  @Column({ type: 'text', nullable: true })
  signatories: string; // JSON string

  // --- SECTION G: OFFICIAL USE ---
  @Column({ nullable: true })
  officialZone: string;

  @Column({ nullable: true })
  receivedBy: string;

  @Column({ type: 'text', nullable: true })
  officialRemarks: string;

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
