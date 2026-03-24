import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemConfig } from '../entities/system-config.entity';

@Injectable()
export class SystemConfigService {
  constructor(
    @InjectRepository(SystemConfig)
    private configRepository: Repository<SystemConfig>,
  ) {}

  async findAll(): Promise<SystemConfig[]> {
    return this.configRepository.find();
  }

  async findOne(key: string): Promise<SystemConfig> {
    const config = await this.configRepository.findOne({ where: { key } });
    if (!config) throw new NotFoundException(`Config key ${key} not found`);
    return config;
  }

  async update(key: string, value: string): Promise<SystemConfig> {
    const config = await this.findOne(key);
    config.value = value;
    return this.configRepository.save(config);
  }

  async create(data: Partial<SystemConfig>): Promise<SystemConfig> {
    const config = this.configRepository.create(data);
    return this.configRepository.save(config);
  }
}
