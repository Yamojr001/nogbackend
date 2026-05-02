import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TreeRepository, Repository } from 'typeorm';
import { Organisation } from '../entities/organisation.entity';
import { CreateOrganisationDto } from './dto/create-organisation.dto';
import { UpdateOrganisationDto } from './dto/update-organisation.dto';
import { NotFoundException } from '@nestjs/common';
import { User, UserRole } from '../entities/user.entity';
import * as bcrypt from 'bcrypt';
import { ParallexPaymentService } from '../parallex/parallex-payment.service';

@Injectable()
export class OrganisationService {
  constructor(
    @Inject('ORGANISATION_TREE_REPO')
    private organisationTreeRepository: TreeRepository<Organisation>,
    @InjectRepository(Organisation)
    private organisationRepository: Repository<Organisation>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly parallexPaymentService: ParallexPaymentService,
  ) {}

  private getCreatorRole(type?: string): UserRole {
    switch (type) {
      case 'partner':
        return UserRole.PARTNER_ADMIN;
      case 'sub_org':
        return UserRole.SUB_ORG_ADMIN;
      case 'apex':
      default:
        return UserRole.SUPER_ADMIN;
    }
  }

  async create(data: CreateOrganisationDto): Promise<Organisation> {
    const parentCode = (data as any).parentOrgCode;
    
    if (parentCode) {
      const parent = await this.organisationRepository.findOne({ where: { code: parentCode } });
      if (!parent) throw new Error('Parent organization with this code not found');
      
      // Hierarchy validation
      if (data.type === 'sub_org' && parent.type !== 'partner') {
        throw new Error('Sub-Organization must belong to a Partner Organization');
      }
      if (data.type === 'partner' && parent.type !== 'apex') {
        throw new Error('Partner Organization must belong to the National Apex');
      }
      
      (data as any).parent = parent;
    } else if (data.parentId) {
      const parent = await this.organisationRepository.findOne({ where: { id: data.parentId } });
      if (!parent) throw new Error('Parent organization not found');
      (data as any).parent = parent;
    } else if (data.type === 'sub_org') {
       throw new Error('Sub-Organization must have a parent Partner Organization');
    }

    // Generate unique modern code (XX-0000)
    const { generateOrgCode } = require('../utils/code-generator.util');
    (data as any).code = generateOrgCode();

    const org = this.organisationRepository.create(data as any) as any;
    const savedOrg = await this.organisationRepository.save(org as any);

    const loginEmail = data.repEmail || data.email;
    const tempPassword = data.repPhone || data.phone;

    if (loginEmail && tempPassword) {
      const existing = await this.userRepository.findOne({ where: [{ email: loginEmail }, { phone: tempPassword }] });
      if (existing) {
        throw new BadRequestException('A user with this email or phone already exists.');
      }

      const passwordHash = await bcrypt.hash(String(tempPassword), 10);
      const adminUser = this.userRepository.create({
        email: loginEmail,
        phone: tempPassword,
        password: passwordHash,
        name: data.repName || data.name,
        firstName: data.repName?.split(' ')?.[0] || data.name?.split(' ')?.[0] || data.name,
        role: this.getCreatorRole(savedOrg.type),
        organisationId: savedOrg.id,
        organisation: { id: savedOrg.id } as Organisation,
        status: 'active',
        isVerified: true,
        mustChangePassword: true,
      });

      const savedUser = await this.userRepository.save(adminUser);
      savedOrg.representativeUserId = savedUser.id;
      await this.organisationRepository.save(savedOrg);
    }

    // Auto-create Parallex Virtual Account for Organisation
    try {
      await this.parallexPaymentService.createOrganisationVirtualAccount(savedOrg.id);
    } catch (vaErr) {
      console.error('[OrganisationService] Parallex VA creation failed:', vaErr.message);
    }

    return savedOrg;
  }

  private async generateCode(type: string): Promise<string> {
    const prefix = type === 'partner' ? 'ORG' : type === 'sub_org' ? 'SUB' : 'GRP';
    const orgs = await this.organisationRepository.find({
      where: { type: type as any },
      order: { id: 'DESC' },
      take: 1
    });
    const lastOrg = orgs[0];
    
    const lastId = lastOrg ? lastOrg.id : 0;
    const nextId = (lastId + 1).toString().padStart(4, '0');
    return `${prefix}-${nextId}`;
  }

  async findAll(): Promise<Organisation[]> {
    try {
      // Use standard repository for faster listing, bypassing tree repo overhead
      return await this.organisationRepository.find({ 
        relations: ['parent'],
        order: { id: 'DESC' }
      });
    } catch (error) {
      console.error('[OrganisationService] findAll failed:', error.message);
      throw error;
    }
  }

  async findOne(id: number): Promise<Organisation> {
    return this.organisationRepository.findOne({ where: { id }, relations: ['parent', 'children'] });
  }

  async update(id: number, data: UpdateOrganisationDto): Promise<Organisation> {
    const org = await this.findOne(id);
    if (!org) throw new NotFoundException(`Organisation with ID ${id} not found`);

    Object.assign(org, data);
    return this.organisationRepository.save(org);
  }

  async remove(id: number): Promise<void> {
    await this.organisationRepository.delete(id);
  }

  async suspend(id: number, reason: string): Promise<Organisation> {
    await this.organisationRepository.update(id, { status: 'suspended' });
    // In production, we'd log 'reason' to AuditLog here
    return this.findOne(id);
  }

  async activate(id: number): Promise<Organisation> {
    await this.organisationRepository.update(id, { status: 'active' });
    return this.findOne(id);
  }
}
