import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bank } from '../entities/bank.entity';
import { NIGERIAN_BANKS } from './data/banks.data';

@Injectable()
export class BanksService implements OnModuleInit {
  constructor(
    @InjectRepository(Bank)
    private readonly bankRepository: Repository<Bank>,
  ) {}

  async onModuleInit() {
    await this.seedBanks();
  }

  async seedBanks() {
    const count = await this.bankRepository.count();
    if (count === 0) {
      console.log('Seeding initial Nigerian banks...');
      const banks = NIGERIAN_BANKS.map((bank) => this.bankRepository.create(bank));
      await this.bankRepository.save(banks);
      console.log(`Successfully seeded ${banks.length} banks.`);
    }
  }

  async findAll(): Promise<Bank[]> {
    return this.bankRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }
}
