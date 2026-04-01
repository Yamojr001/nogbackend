import { Entity, PrimaryGeneratedColumn, Column, OneToMany, Tree, TreeChildren, TreeParent, JoinColumn, OneToOne } from 'typeorm';
import { User } from './user.entity';

export enum OrganisationType {
  APEX = 'apex',
  PARTNER = 'partner',
  SUB_ORG = 'sub_org',
}

@Entity('organizations')
@Tree("adjacency-list")
export class Organisation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, nullable: true })
  code: string; 

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

  @Column({ name: 'registration_number', nullable: true })
  regNumber: string;

  @Column({
    type: 'enum',
    enum: OrganisationType,
    default: OrganisationType.SUB_ORG,
  })
  type: OrganisationType;

  @Column({ name: 'hq_address', nullable: true })
  hqAddress: string;

  @Column({ name: 'establishment_date', nullable: true })
  establishmentDate: Date;

  @Column({ name: 'org_type_str', nullable: true })
  orgTypeStr: string;

  @Column({ name: 'active_member_count', nullable: true })
  activeMemberCount: number;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  state: string;

  @Column({ name: 'operating_states', nullable: true, type: 'text' })
  operatingStates: string;

  // --- SECTION B & C: REPRESENTATIVE ---
  @Column({ name: 'rep_name', nullable: true })
  repName: string;

  @Column({ name: 'rep_position', nullable: true })
  repPosition: string;

  @Column({ name: 'rep_phone', nullable: true })
  repPhone: string;

  @Column({ name: 'rep_email', nullable: true })
  repEmail: string;

  @Column({ name: 'rep_gender', nullable: true })
  repGender: string;

  @Column({ name: 'rep_nationality', nullable: true })
  repNationality: string;

  @Column({ name: 'rep_state_of_origin', nullable: true })
  repStateOfOrigin: string;

  @Column({ name: 'rep_lga', nullable: true })
  repLga: string;

  @Column({ name: 'rep_nin', nullable: true })
  repNin: string;

  @Column({ name: 'rep_bvn', nullable: true })
  repBvn: string;

  @Column({ name: 'rep_id_type', nullable: true })
  repIdType: string;

  @Column({ name: 'rep_id_url', nullable: true })
  repIdUrl: string;

  @Column({ name: 'rep_passport_url', nullable: true })
  repPassportUrl: string;

  // --- SECTION D: SAVINGS & ENGAGEMENT ---
  @Column({ name: 'participate_in_savings', default: false })
  participateInSavings: boolean;

  @Column({ name: 'savings_frequency', nullable: true })
  savingsFrequency: string;

  @Column({ name: 'monthly_contribution_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
  monthlyContributionAmount: number;

  @Column({ name: 'areas_of_participation', type: 'text', nullable: true })
  areasOfParticipation: string;

  @Column({ name: 'proposed_beneficiaries', nullable: true })
  proposedBeneficiaries: number;

  // --- SECTION E: ORG BANK DETAILS ---
  @Column({ name: 'org_account_name', nullable: true })
  orgAccountName: string;

  @Column({ name: 'org_bank_name', nullable: true })
  orgBankName: string;

  @Column({ name: 'org_account_number', nullable: true })
  orgAccountNumber: string;

  @Column({ name: 'org_bvn', nullable: true })
  orgBvn: string;

  @Column({ type: 'text', nullable: true })
  signatories: string;

  // --- SECTION G: OFFICIAL USE ---
  @Column({ name: 'official_zone', nullable: true })
  officialZone: string;

  @Column({ name: 'received_by', nullable: true })
  receivedBy: string;

  @Column({ name: 'official_remarks', type: 'text', nullable: true })
  officialRemarks: string;

  @Column({ name: 'kyc_status', default: 'pending' })
  kycStatus: string;

  @Column({ name: 'logo_url', nullable: true })
  logoUrl: string;

  @Column({ name: 'status', default: 'active' })
  status: string;

  @Column({ name: 'representative_user_id', nullable: true })
  representativeUserId: number;

  @OneToOne(() => User)
  @JoinColumn({ name: 'representative_user_id' })
  representative: User;

  @Column({ name: 'bank_account_id', nullable: true })
  bankAccountId: number;

  @Column({ name: 'parent_id', nullable: true })
  parentId: number;

  @TreeParent()
  @JoinColumn({ name: 'parent_id' })
  parent: Organisation;

  @TreeChildren()
  children: Organisation[];

  @OneToMany(() => User, user => user.organisation)
  users: User[];

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
