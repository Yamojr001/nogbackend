import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Member } from '../entities/member.entity';
import { Loan, LoanStatus } from '../entities/loan.entity';
import { Transaction, TransactionStatus } from '../entities/transaction.entity';
import { SupportTicket, TicketStatus } from '../entities/support-ticket.entity';
import { Beneficiary } from '../entities/beneficiary.entity';
import { User } from '../entities/user.entity';
import { RepaymentSchedule, RepaymentStatus } from '../entities/repayment-schedule.entity';
import { ProgramApplication } from '../entities/program-application.entity';

@Injectable()
export class MemberService {
  constructor(
    @InjectRepository(Member) private memberRepo: Repository<Member>,
    @InjectRepository(Loan) private loanRepo: Repository<Loan>,
    @InjectRepository(Transaction) private txnRepo: Repository<Transaction>,
    @InjectRepository(SupportTicket) private ticketRepo: Repository<SupportTicket>,
    @InjectRepository(Beneficiary) private beneficiaryRepo: Repository<Beneficiary>,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(RepaymentSchedule) private scheduleRepo: Repository<RepaymentSchedule>,
    @InjectRepository(ProgramApplication) private programAppRepo: Repository<ProgramApplication>,
    private dataSource: DataSource,
  ) {}

  async getDashboardStats(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['memberProfile', 'memberProfile.wallet', 'memberProfile.group'],
    });

    if (!user || !user.memberProfile) {
      return {
        savingsBalance: 0,
        loanBalance: 0,
        activeLoansCount: 0,
        nextRepaymentDate: null,
        groupName: 'Not Assigned',
        recentActivities: [],
      };
    }

    const member = user.memberProfile;
    const walletBalance = member.wallet ? Number(member.wallet.balance) : 0;

    // Get active loans
    const activeLoans = await this.loanRepo.find({
      where: { member: { id: member.id }, status: LoanStatus.ACTIVE },
      relations: ['repaymentSchedule'],
    });

    const nextRepayment = activeLoans
      .flatMap((l) => l.repaymentSchedule)
      .filter((s) => s && s.status === RepaymentStatus.SCHEDULED)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

    // Get recent transactions (contributions + loans)
    let recentActivities = [];
    if (member.wallet?.id) {
      recentActivities = await this.txnRepo.find({
        where: [
          { fromWallet: { id: member.wallet.id } },
          { toWallet: { id: member.wallet.id } }
        ],
        order: { createdAt: 'DESC' },
        take: 5,
      });
    }

    // Get empowerment applications
    const applicationsCount = await this.programAppRepo.count({
      where: { applicantId: member.userId }
    });

    return {
      savingsBalance: walletBalance,
      loanBalance: activeLoans.reduce((sum, l) => sum + Number(l.amount), 0),
      activeLoansCount: activeLoans.length,
      applicationsCount,
      nextRepaymentDate: nextRepayment?.dueDate || null,
      groupName: member.group?.name || 'Individual Member',
      recentActivities: recentActivities.map(tx => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        createdAt: tx.createdAt,
        status: tx.status
      })),
    };
  }

  async getWallet(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['memberProfile', 'memberProfile.wallet'],
    });
    if (!user?.memberProfile?.wallet) {
      throw new Error('Wallet not found for this member');
    }
    return user.memberProfile.wallet;
  }

  async getTransactions(userId: number, filters: any = {}) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['memberProfile', 'memberProfile.wallet'],
    });
    if (!user?.memberProfile?.wallet) return [];

    const walletId = user.memberProfile.wallet.id;
    const query = this.txnRepo.createQueryBuilder('t')
      .where('(t.fromWalletId = :walletId OR t.toWalletId = :walletId)', { walletId })
      .orderBy('t.createdAt', 'DESC');

    if (filters.startDate) {
      query.andWhere('t.createdAt >= :startDate', { startDate: new Date(filters.startDate) });
    }

    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setDate(end.getDate() + 1);
      query.andWhere('t.createdAt < :endDate', { endDate: end });
    }

    if (filters.search) {
      query.andWhere('(t.reference ILIKE :search OR t.externalReference ILIKE :search OR t.description ILIKE :search)', {
        search: `%${filters.search}%`
      });
    }

    if (filters.status) {
      query.andWhere('t.status = :status', { status: filters.status });
    }

    return query.take(100).getMany();
  }

  async getNotifications(userId: number) {
    // Basic retrieval from the Notification entity via DataSource
    return this.dataSource.getRepository('Notification').find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 20
    });
  }

  async getProfile(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['memberProfile', 'memberProfile.group', 'memberProfile.branch']
    });
    if (!user) throw new NotFoundException('User not found');

    const beneficiaries = user.memberProfile?.id 
      ? await this.beneficiaryRepo.find({ where: { memberId: user.memberProfile.id } })
      : [];

    return {
      user,
      beneficiaries
    };
  }

  async getSavingsHistory(userId: number) {
    const member = await this.memberRepo.findOne({ where: { userId } });
    if (!member) throw new NotFoundException('Member not found');

    return this.txnRepo.find({
      where: { memberId: member.id, type: 'contribution' as any },
      order: { createdAt: 'DESC' }
    });
  }

  async getLoans(userId: number) {
    const member = await this.memberRepo.findOne({ where: { userId } });
    if (!member) throw new NotFoundException('Member not found');

    return this.loanRepo.find({
      where: { member: { id: member.id } },
      relations: ['repaymentSchedule'],
      order: { createdAt: 'DESC' }
    });
  }

  async createSupportTicket(userId: number, payload: any) {
    const member = await this.memberRepo.findOne({ where: { userId } });
    if (!member) throw new NotFoundException('Member not found');

    const ticket = this.ticketRepo.create({
      ...payload,
      memberId: member.id,
      status: TicketStatus.OPEN
    });
    return this.ticketRepo.save(ticket);
  }

  async getMyTickets(userId: number) {
    const member = await this.memberRepo.findOne({ where: { userId } });
    if (!member) throw new NotFoundException('Member not found');

    return this.ticketRepo.find({
      where: { memberId: member.id },
      order: { createdAt: 'DESC' }
    });
  }

  async activate(id: number) {
    const member = await this.memberRepo.findOne({ where: { id }, relations: ['user'] });
    if (member) {
      await this.memberRepo.update(id, { status: 'active', kycStatus: 'approved' });
      await this.userRepository.update(member.userId, { isVerified: true });
    }
  }

  async reject(id: number, reason?: string) {
    await this.memberRepo.update(id, { status: 'rejected', kycStatus: 'rejected' });
  }
}
