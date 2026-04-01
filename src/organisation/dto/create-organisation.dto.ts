import { IsEnum, IsNotEmpty, IsOptional, IsString, IsEmail, IsInt } from 'class-validator';
import { OrganisationType } from '../../entities/organisation.entity';

export class CreateOrganisationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  acronym?: string;

  @IsString()
  @IsOptional()
  sector?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  regNumber?: string;

  @IsEnum(OrganisationType)
  @IsOptional()
  type?: OrganisationType;

  @IsString()
  @IsOptional()
  hqAddress?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  operatingStates?: string;

  @IsInt()
  @IsOptional()
  parentId?: number;

  @IsInt()
  @IsOptional()
  representativeUserId?: number;

  @IsOptional()
  establishmentDate?: Date;

  @IsString()
  @IsOptional()
  orgTypeStr?: string;

  @IsInt()
  @IsOptional()
  activeMemberCount?: number;

  // --- SECTION B & C: REPRESENTATIVE ---
  @IsString()
  @IsOptional()
  repName?: string;

  @IsString()
  @IsOptional()
  repPosition?: string;

  @IsString()
  @IsOptional()
  repPhone?: string;

  @IsEmail()
  @IsOptional()
  repEmail?: string;

  @IsString()
  @IsOptional()
  repGender?: string;

  @IsString()
  @IsOptional()
  repNationality?: string;

  @IsString()
  @IsOptional()
  repStateOfOrigin?: string;

  @IsString()
  @IsOptional()
  repLga?: string;

  @IsString()
  @IsOptional()
  repNin?: string;

  @IsString()
  @IsOptional()
  repBvn?: string;

  @IsString()
  @IsOptional()
  repIdType?: string;

  @IsString()
  @IsOptional()
  repIdUrl?: string;

  @IsString()
  @IsOptional()
  repPassportUrl?: string;

  // --- SECTION D: SAVINGS & ENGAGEMENT ---
  @IsOptional()
  participateInSavings?: boolean;

  @IsString()
  @IsOptional()
  savingsFrequency?: string;

  @IsOptional()
  monthlyContributionAmount?: number;

  @IsString()
  @IsOptional()
  areasOfParticipation?: string;

  @IsInt()
  @IsOptional()
  proposedBeneficiaries?: number;

  // --- SECTION E: ORG BANK DETAILS ---
  @IsString()
  @IsOptional()
  orgAccountName?: string;

  @IsString()
  @IsOptional()
  orgBankName?: string;

  @IsString()
  @IsOptional()
  orgAccountNumber?: string;

  @IsString()
  @IsOptional()
  orgBvn?: string;

  @IsString()
  @IsOptional()
  signatories?: string;

  // --- SECTION G: OFFICIAL USE ---
  @IsString()
  @IsOptional()
  officialZone?: string;

  @IsString()
  @IsOptional()
  receivedBy?: string;

  @IsString()
  @IsOptional()
  officialRemarks?: string;
}
