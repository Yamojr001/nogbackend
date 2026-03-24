import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Member } from './member.entity';
import { Organisation } from './organisation.entity';

export enum KycDocumentType {
  NIN = 'nin',                     // National ID Number
  BVN = 'bvn',                     // Bank Verification Number
  PASSPORT = 'passport',
  DRIVERS_LICENSE = 'drivers_license',
  VOTER_CARD = 'voter_card',
  UTILITY_BILL = 'utility_bill',
  BUSINESS_REG = 'business_registration',
  TAX_ID = 'tax_id',
}

export enum KycStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

/**
 * KycDocument â€“ Stores identity and compliance documents for members.
 * One member can have multiple KYC documents (NIN, BVN, passport, utility bill, etc.)
 */
@Entity('kyc_documents')
export class KycDocument {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Member)
  @JoinColumn()
  member: Member;

  @Column()
  memberId: number;

  @ManyToOne(() => Organisation)
  @JoinColumn()
  organisation: Organisation;

  @Column()
  organisationId: number;

  @Column({ type: 'enum', enum: KycDocumentType })
  documentType: KycDocumentType;

  @Column({ nullable: true })
  documentNumber: string; // e.g., NIN or BVN number

  @Column({ nullable: true })
  documentUrl: string; // S3 / storage path of uploaded file

  @Column({ nullable: true })
  documentFileName: string;

  @Column({ type: 'enum', enum: KycStatus, default: KycStatus.PENDING })
  status: KycStatus;

  @Column({ nullable: true })
  reviewedBy: number; // FK to User who reviewed

  @Column({ nullable: true, type: 'text' })
  rejectionReason: string;

  @Column({ nullable: true, type: 'date' })
  expiryDate: Date;

  @CreateDateColumn()
  uploadedAt: Date;

  @UpdateDateColumn()
  reviewedAt: Date;
}
