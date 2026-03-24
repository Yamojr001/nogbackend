import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Audit } from '../entities/audit.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(Audit)
    private auditRepository: Repository<Audit>,
  ) {}

  async create(data: Partial<Audit>): Promise<Audit> {
    const entry = this.auditRepository.create(data);
    return this.auditRepository.save(entry);
  }

  async findAll(): Promise<Audit[]> {
    return this.auditRepository.find({ relations: ['user'] });
  }

  async findOne(id: number): Promise<Audit> {
    return this.auditRepository.findOne({ where: { id }, relations: ['user'] });
  }
}
