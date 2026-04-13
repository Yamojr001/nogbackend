import { IsEmail, IsNotEmpty, IsString, IsEnum, MinLength, IsOptional, Matches } from 'class-validator';
import { UserRole } from '../../entities/user.entity';

export class RegisterUserDto {
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z\s-]+$/, { message: 'First name must contain only letters, spaces, or hyphens' })
  firstName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z\s-]+$/, { message: 'Last name must contain only letters, spaces, or hyphens' })
  lastName?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/, { message: 'Invalid phone number format' })
  phone?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  maritalStatus?: string;

  @IsOptional()
  @IsString()
  stateOfOrigin?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  occupation?: string;

  @IsOptional()
  @IsString()
  educationalQualification?: string;

  @IsOptional()
  @IsString()
  nin?: string;

  @IsOptional()
  @IsString()
  bvn?: string;

  // Banking
  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  accountName?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  // Next of Kin
  @IsOptional()
  @IsString()
  nokName?: string;

  @IsOptional()
  @IsString()
  nokRelationship?: string;

  @IsOptional()
  @IsString()
  nokPhone?: string;

  @IsOptional()
  @IsString()
  nokAddress?: string;

  // Preferences
  @IsOptional()
  @IsString()
  savingsFrequency?: string;

  @IsOptional()
  proposedSavingsAmount?: number;

  @IsOptional()
  @IsString()
  empowermentInterest?: string;

  // Affiliation
  @IsOptional()
  @IsString()
  extOrgName?: string;

  @IsOptional()
  @IsString()
  extPosition?: string;

  @IsOptional()
  @IsString()
  extStateChapter?: string;

  @IsOptional()
  subOrgId?: number;

  @IsOptional()
  groupId?: number;

  @IsOptional()
  branchId?: number;

  @IsOptional()
  registrationOfficerId?: number;

  @IsString()
  @IsOptional()
  organisationCode?: string;

  @IsOptional()
  organisationId?: number;

  @IsString()
  @IsOptional()
  token?: string;
}
