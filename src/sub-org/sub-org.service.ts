import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from '../entities/branch.entity';
import { Member } from '../entities/member.entity';
import { Transaction } from '../entities/transaction.entity';

@Injectable()
export class SubOrgService {
  constructor(
    @InjectRepository(Branch) private branchRepo: Repository<Branch>,
    @InjectRepository(Member) private memberRepo: Repository<Member>,
    @InjectRepository(Transaction) private txnRepo: Repository<Transaction>,
  ) {}

  async getDashboardStats(branchId: number) {
    try {
      const branch = await this.branchRepo.findOne({ where: { id: branchId } });
      if (!branch) throw new NotFoundException('Branch not found');

      const totalMembers = await this.memberRepo.count({ where: { branchId } });
      const activeMembers = await this.memberRepo.count({ where: { branchId, status: 'active' } });

      const txns = await this.txnRepo.find({ where: { branchId } });
      const totalCollections = txns
        .filter(t => t.type === 'contribution' && t.status === 'completed')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const pendingApprovals = txns.filter(t => t.status.includes('pending')).length;

      return {
        branchName: branch.name,
        totalMembers,
        activeMembers,
        totalCollections,
        pendingApprovals,
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async getMembers(branchId: number) {
    return this.memberRepo.find({
      where: { branchId },
      relations: ['user', 'wallet', 'group'],
    });
  }

  async getFinances(branchId: number) {
    return this.txnRepo.find({
      where: { branchId },
      order: { createdAt: 'DESC' },
      take: 50,
      relations: ['member', 'member.user'],
    });
  }
}
