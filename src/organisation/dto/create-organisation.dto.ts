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
}
