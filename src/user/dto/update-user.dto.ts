import { IsEmail, IsString, IsEnum, IsOptional, MinLength, IsObject, IsBoolean } from 'class-validator';
import { UserRole } from '../../entities/user.entity';
import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {}
