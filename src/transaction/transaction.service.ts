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

  async findAll(filters: {
    organisationId?: number;
    memberId?: number;
    startDate?: string;
    endDate?: string;
    search?: string;
    status?: string;
  }) {
    const query = this.repo.createQueryBuilder('t')
      .leftJoinAndSelect('t.member', 'member')
      .leftJoinAndSelect('t.organisation', 'organisation')
      .leftJoinAndSelect('t.fromWallet', 'fromWallet')
      .leftJoinAndSelect('t.toWallet', 'toWallet')
      .orderBy('t.createdAt', 'DESC');

    if (filters.organisationId) {
      query.andWhere('t.organisationId = :orgId', { orgId: filters.organisationId });
    }

    if (filters.memberId) {
      query.andWhere('t.memberId = :memberId', { memberId: filters.memberId });
    }

    if (filters.status) {
      query.andWhere('t.status = :status', { status: filters.status });
    }

    if (filters.startDate) {
      query.andWhere('t.createdAt >= :startDate', { startDate: new Date(filters.startDate) });
    }

    if (filters.endDate) {
      // Add one day to end date to include the entire day
      const end = new Date(filters.endDate);
      end.setDate(end.getDate() + 1);
      query.andWhere('t.createdAt < :endDate', { endDate: end });
    }

    if (filters.search) {
      query.andWhere('(t.reference ILIKE :search OR t.externalReference ILIKE :search OR t.description ILIKE :search)', { 
        search: `%${filters.search}%` 
      });
    }

    return query.take(200).getMany();
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
