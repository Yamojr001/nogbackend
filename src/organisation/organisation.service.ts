import { Injectable, Inject } from '@nestjs/common';
import { TreeRepository } from 'typeorm';
import { Organisation } from '../entities/organisation.entity';
import { CreateOrganisationDto } from './dto/create-organisation.dto';
import { UpdateOrganisationDto } from './dto/update-organisation.dto';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class OrganisationService {
  constructor(
    @Inject('ORGANISATION_TREE_REPO')
    private organisationRepository: TreeRepository<Organisation>,
  ) {}

  async create(data: CreateOrganisationDto): Promise<Organisation> {
    if (data.parentId) {
      const parent = await this.organisationRepository.findOne({ where: { id: data.parentId } });
      if (!parent) throw new Error('Parent organization not found');
      
      // Hierarchy validation
      if (data.type === 'sub_org' && parent.type !== 'partner') {
        throw new Error('Sub-Organization must belong to a Partner Organization');
      }
      if (data.type === 'partner' && parent) {
        throw new Error('Partner Organization cannot have a parent');
      }
      
      (data as any).parent = parent;
    } else if (data.type === 'sub_org') {
       throw new Error('Sub-Organization must have a parent Partner Organization');
    }

    // Generate unique code
    (data as any).code = await this.generateCode(data.type);

    const org = this.organisationRepository.create(data as any);
    return this.organisationRepository.save(org) as any;
  }

  private async generateCode(type: string): Promise<string> {
    const prefix = type === 'partner' ? 'ORG' : type === 'sub_org' ? 'SUB' : 'GRP';
    const lastOrg = await this.organisationRepository.findOne({
      where: { type: type as any },
      order: { id: 'DESC' }
    });
    
    const lastId = lastOrg ? lastOrg.id : 0;
    const nextId = (lastId + 1).toString().padStart(4, '0');
    return `${prefix}-${nextId}`;
  }

  async findAll(): Promise<Organisation[]> {
    return this.organisationRepository.find({ relations: ['parent'] });
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
