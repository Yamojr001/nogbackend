import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private repo: Repository<Transaction>,
  ) {}

  async findAll(organisationId?: number) {
    const where: any = {};
    if (organisationId) where.organisationId = organisationId;
    return this.repo.find({
      where,
      relations: ['fromWallet', 'toWallet', 'member', 'organisation'],
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }

  async findOne(id: number) {
    return this.repo.findOne({
      where: { id },
      relations: ['fromWallet', 'toWallet', 'member', 'organisation'],
    });
  }

  async findByReference(reference: string) {
    return this.repo.findOne({
      where: { reference },
      relations: ['fromWallet', 'toWallet'],
    });
  }

  async getSummary() {
    const all = await this.repo.find();
    const total = all.reduce((s, t) => s + Number(t.amount || 0), 0);
    const completed = all.filter(t => t.status === 'completed').length;
    return { total, count: all.length, completed };
  }
}
