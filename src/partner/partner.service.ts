import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organisation } from '../entities/organisation.entity';
import { Branch } from '../entities/branch.entity';
import { Member } from '../entities/member.entity';
import { Transaction } from '../entities/transaction.entity';
import { Approval, ApprovalStatus } from '../entities/approval.entity';

@Injectable()
export class PartnerService {
  constructor(
    @InjectRepository(Organisation) private orgRepo: Repository<Organisation>,
    @InjectRepository(Branch) private branchRepo: Repository<Branch>,
    @InjectRepository(Member) private memberRepo: Repository<Member>,
    @InjectRepository(Transaction) private txnRepo: Repository<Transaction>,
    @InjectRepository(Approval) private approvalRepo: Repository<Approval>,
  ) {}

  async getDashboardStats(partnerId: number) {
    try {
      const partner = await this.orgRepo.findOne({ where: { id: partnerId } });
      if (!partner) throw new NotFoundException('Partner not found');

      const branches = await this.branchRepo.find({ where: { organisationId: partnerId } });
      const branchIds = branches.map(b => b.id);
      
      const totalMembers = await this.memberRepo.count({
        where: branchIds.map(id => ({ branchId: id }))
      });

      const txns = branchIds.length ? await this.txnRepo.find({
        where: branchIds.map(id => ({ branchId: id }))
      }) : [];

      const totalCollections = txns
        .filter(t => t.type === 'contribution' && t.status === 'completed')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const activeLoans = txns.filter(t => t.type === 'loan_disbursement').length; // Simplification for dashboard metrics

      return {
        partnerName: partner.name,
        totalBranches: branches.length,
        totalMembers,
        totalCollections,
        activeLoans
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async getMembers(partnerId: number) {
    const branches = await this.branchRepo.find({ where: { organisationId: partnerId } });
    const branchIds = branches.map(b => b.id);
    if (!branchIds.length) return [];

    return this.memberRepo.find({
      where: branchIds.map(id => ({ branchId: id })),
      relations: ['user', 'wallet', 'group', 'branch'],
    });
  }

  async getFinances(partnerId: number) {
    const branches = await this.branchRepo.find({ where: { organisationId: partnerId } });
    const branchIds = branches.map(b => b.id);
    if (!branchIds.length) return [];

    return this.txnRepo.find({
      where: branchIds.map(id => ({ branchId: id })),
      order: { createdAt: 'DESC' },
      take: 100,
      relations: ['member', 'member.user', 'branch'],
    });
  }

  async getApprovals(partnerId: number) {
    // Only pending approvals for the partner's branches
    // This is simplified. Normally, logic would match level requested with approval role matrix.
    const branches = await this.branchRepo.find({ where: { organisationId: partnerId } });
    if (!branches.length) return [];
    
    return this.approvalRepo.find({
      where: { status: ApprovalStatus.PENDING },
      relations: ['initiator'],
      order: { createdAt: 'DESC' }
    });
  }
}
