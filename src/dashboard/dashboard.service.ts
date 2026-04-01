import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustodialAccount } from '../entities/custodial-account.entity';
import { Organisation, OrganisationType } from '../entities/organisation.entity';
import { Member } from '../entities/member.entity';
import { Approval, ApprovalStatus } from '../entities/approval.entity';
import { Transaction, TransactionType, TransactionStatus } from '../entities/transaction.entity';
import { SystemAlert } from '../entities/system-alert.entity';
import { Wallet } from '../entities/wallet.entity';
import { UserRole } from '../entities/user.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(CustodialAccount) private custodialRepo: Repository<CustodialAccount>,
    @InjectRepository(Organisation) private orgRepo: Repository<Organisation>,
    @InjectRepository(Member) private memberRepo: Repository<Member>,
    @InjectRepository(Approval) private approvalRepo: Repository<Approval>,
    @InjectRepository(Transaction) private txnRepo: Repository<Transaction>,
    @InjectRepository(SystemAlert) private alertRepo: Repository<SystemAlert>,
    @InjectRepository(Wallet) private walletRepo: Repository<Wallet>,
  ) {}

  async getStats(user: any) {
    try {
      const { role, organisationId, userId } = user;

      // Scoping logic
      let memberCount = 0;
      let totalFunds = 0;
      let loanTotal = 0;
      let pendingCount = 0;

      if (role === UserRole.SUPER_ADMIN || role === UserRole.APEX_ADMIN) {
        // Global view
        memberCount = await this.memberRepo.count();
        
        // Sum balances efficiently
        const result = await this.walletRepo.createQueryBuilder('wallet')
          .select('SUM(wallet.balance)', 'total')
          .getRawOne();
        totalFunds = Number(result?.total || 0);

        pendingCount = await this.approvalRepo.count({ where: { status: ApprovalStatus.PENDING } });
        
        const loanResult = await this.txnRepo.createQueryBuilder('txn')
          .select('SUM(txn.amount)', 'total')
          .where('txn.type = :type', { type: TransactionType.LOAN_DISBURSEMENT })
          .andWhere('txn.status = :status', { status: TransactionStatus.COMPLETED })
          .getRawOne();
        loanTotal = Number(loanResult?.total || 0);
      } else if (role === UserRole.PARTNER_ADMIN || role === UserRole.SUB_ORG_ADMIN) {
        // Organisation view
        memberCount = await this.memberRepo.count({ where: { organisationId } });
        
        const orgWallets = await this.walletRepo.createQueryBuilder('wallet')
          .innerJoin('user', 'u', 'u.id = wallet.ownerId')
          .where('u.organisationId = :organisationId', { organisationId })
          .getMany();
        totalFunds = orgWallets.reduce((sum, w) => sum + Number(w.balance), 0);

        const orgLoans = await this.txnRepo.createQueryBuilder('txn')
          .innerJoin('user', 'u', 'u.id = txn.memberId')
          .where('u.organisationId = :organisationId', { organisationId })
          .andWhere('txn.type = :type', { type: TransactionType.LOAN_DISBURSEMENT })
          .andWhere('txn.status = :status', { status: TransactionStatus.COMPLETED })
          .getMany();
        loanTotal = orgLoans.reduce((sum, l) => sum + Number(l.amount), 0);
      } else if (role === UserRole.MEMBER) {
        // Individual view
        const member = await this.memberRepo.findOne({ where: { userId }, relations: ['wallet'] });
        totalFunds = member?.wallet ? Number(member.wallet.balance) : 0;
        
        const loans = await this.txnRepo.createQueryBuilder('txn')
          .where('txn.memberId = :memberId', { memberId: member?.id })
          .andWhere('txn.type = :type', { type: TransactionType.LOAN_DISBURSEMENT })
          .getMany();
        loanTotal = loans.reduce((sum, l) => sum + Number(l.amount), 0);
      }

      return {
        memberCount,
        totalFunds,
        loanTotal,
        pendingCount,
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch dashboard stats');
    }
  }

  async getCharts(user: any) {
    try {
      const { role, organisationId } = user;
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentYear = new Date().getFullYear();

      // Build monthly contribution totals from real transaction data
      const query = this.txnRepo
        .createQueryBuilder('txn')
        .select("EXTRACT(MONTH FROM txn.createdAt)", "month")
        .addSelect("SUM(txn.amount)", "total")
        .addSelect("txn.type", "type")
        .where("EXTRACT(YEAR FROM txn.createdAt) = :year", { year: currentYear })
        .andWhere("txn.status = 'completed'");

      if (role !== UserRole.SUPER_ADMIN && role !== UserRole.APEX_ADMIN) {
        query.andWhere("txn.organisationId = :organisationId", { organisationId });
      }

      const txns = await query.groupBy("EXTRACT(MONTH FROM txn.createdAt), txn.type").getRawMany();

      // Aggregate by month
      const byMonth: Record<number, { revenue: number; loans: number }> = {};
      for (let i = 1; i <= 12; i++) byMonth[i] = { revenue: 0, loans: 0 };
      for (const row of txns) {
        const m = parseInt(row.month);
        const amount = parseFloat(row.total) || 0;
        if (row.type === TransactionType.LOAN_DISBURSEMENT) byMonth[m].loans += amount;
        else byMonth[m].revenue += amount;
      }

      const financialData = months.map((name, i) => ({
        name,
        revenue: byMonth[i + 1].revenue,
        loans: byMonth[i + 1].loans,
      }));

      let distributionData: any[] = [];
      if (role === UserRole.SUPER_ADMIN || role === UserRole.APEX_ADMIN) {
        const accounts = await this.custodialRepo.find();
        distributionData = accounts.map(acc => ({
          name: acc.name,
          value: Number(acc.balance),
        }));
      }

      return { financialData, distributionData };
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch dashboard charts');
    }
  }

  async getAlerts(user: any) {
    try {
      const { role, organisationId } = user;
      const query = this.alertRepo.createQueryBuilder('alert');
      
      if (role !== UserRole.SUPER_ADMIN && role !== UserRole.APEX_ADMIN) {
        query.where("alert.organisationId = :organisationId", { organisationId });
      }

      return query.orderBy('alert.createdAt', 'DESC').take(5).getMany();
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch dashboard alerts');
    }
  }
}
