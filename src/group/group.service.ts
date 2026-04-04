import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { GroupSyncDto } from './dto/group.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group } from '../entities/group.entity';
import { Member } from '../entities/member.entity';
import { Transaction, TransactionType, TransactionStatus } from '../entities/transaction.entity';
import { Loan } from '../entities/loan.entity';
import { User, UserRole } from '../entities/user.entity';

@Injectable()
export class GroupService {
  constructor(
    @InjectRepository(Group) private groupRepo: Repository<Group>,
    @InjectRepository(Member) private memberRepo: Repository<Member>,
    @InjectRepository(Transaction) private txnRepo: Repository<Transaction>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Loan) private loanRepo: Repository<Loan>,
    private dataSource: DataSource,
  ) { }

  async findAll(): Promise<Group[]> {
    return this.groupRepo.find({ relations: ['subOrg'] });
  }

  async getDashboardStats(groupId: number) {
    try {
      const group = await this.groupRepo.findOne({ where: { id: groupId } });
      if (!group) throw new NotFoundException('Group not found');

      const totalMembers = await this.memberRepo.count({ where: { groupId } });

      const groupMembers = await this.memberRepo.find({ where: { groupId } });
      const totalSavings = groupMembers.reduce((sum, m) => sum + Number(m.contributionBalance || 0), 0);

      const activeLoansCount = await this.memberRepo.count({
        where: { groupId, loanStatus: 'active' }
      });

      const pendingRequests = await this.txnRepo.count({
        where: { group: { id: groupId }, status: TransactionStatus.PENDING_APPROVAL }
      });

      return {
        groupName: group.name,
        totalMembers,
        totalSavings,
        activeLoansCount,
        pendingRequests,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException(error.message);
    }
  }

  async getMembers(groupId: number) {
    return this.memberRepo.find({
      where: { groupId },
      relations: ['user', 'wallet'],
    });
  }

  async updateMemberRole(userId: number, role: UserRole) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    user.role = role;
    return this.userRepo.save(user);
  }

  async getGroupFinances(groupId: number) {
    return this.txnRepo.find({
      where: { group: { id: groupId } },
      order: { createdAt: 'DESC' },
      take: 50,
      relations: ['member', 'member.user'],
    });
  }

  async markAttendance(memberId: number, date: Date, status: string) {
    const member = await this.memberRepo.findOne({ where: { id: memberId } });
    if (!member) throw new NotFoundException('Member not found');

    // In a real app, we'd have an Attendance entity. For now, we simulate by logging/updating
    console.log(`Marking attendance for member ${memberId} on ${date}: ${status}`);
    return { success: true, memberId, date, status };
  }

  async syncData(groupId: number, payload: GroupSyncDto) {
    const { contributions, memberUpdates } = payload;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Process contributions
      if (contributions && Array.isArray(contributions)) {
        for (const c of contributions) {
          const member = await queryRunner.manager.findOne(Member, { where: { id: c.memberId } });
          if (member) {
            member.contributionBalance = Number(member.contributionBalance) + Number(c.amount);
            await queryRunner.manager.save(member);

            const txn = queryRunner.manager.create(Transaction, {
              reference: `SYNC-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
              amount: c.amount,
              type: TransactionType.CONTRIBUTION,
              status: TransactionStatus.COMPLETED,
              memberId: c.memberId,
              groupId: groupId,
              description: 'Offline synced contribution',
              organisationId: member.branchId || 1
            });
            await queryRunner.manager.save(txn);
          }
        }
      }

      // Process member updates (optional, if needed)
      if (memberUpdates && Array.isArray(memberUpdates)) {
        for (const update of memberUpdates) {
          const member = await queryRunner.manager.findOne(Member, { where: { id: update.memberId }, relations: ['user'] });
          if (member?.user && update.phone) {
            member.user.phone = update.phone;
            await queryRunner.manager.save(member.user);
          }
        }
      }

      await queryRunner.commitTransaction();
      return { syncedAt: new Date(), status: 'success' };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(`Sync failed: ${err.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  async getGroupLoans(groupId: number) {
    return this.loanRepo.find({
      where: { member: { memberProfile: { groupId } } as any },
      relations: ['member', 'member.memberProfile'],
    });
  }
}
