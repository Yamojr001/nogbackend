import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

import { Organisation, OrganisationType } from './entities/organisation.entity';
import { User, UserRole } from './entities/user.entity';
import { Wallet, WalletType } from './entities/wallet.entity';
import { Ledger } from './entities/ledger.entity';
import { Loan, LoanStatus } from './entities/loan.entity';
import { Approval, ApprovalStatus } from './entities/approval.entity';
import { Group } from './entities/group.entity';
import { Member } from './entities/member.entity';
import { LoanRepayment } from './entities/loan-repayment.entity';
import { ApprovalLog } from './entities/approval-log.entity';
import { Contribution } from './entities/contribution.entity';
import { Notification } from './entities/notification.entity';
import { Audit } from './entities/audit.entity';
import { SystemConfig } from './entities/system-config.entity';
import { Branch } from './entities/branch.entity';
import { Product, ProductType, ProductStatus } from './entities/product.entity';
import { KycDocument, KycDocumentType, KycStatus } from './entities/kyc-document.entity';
import { Transaction, TransactionType, TransactionStatus, TransactionChannel } from './entities/transaction.entity';
import { ContributionPeriod, PeriodStatus } from './entities/contribution-period.entity';
import { RepaymentSchedule, RepaymentStatus } from './entities/repayment-schedule.entity';
import { ProductSubscription, ProductSubscriptionStatus } from './entities/product-subscription.entity';
import { AdminSession } from './entities/admin-session.entity';
import { ApprovalWorkflowConfig, WorkflowType, WorkflowScope } from './entities/approval-workflow-config.entity';
import { CustodialAccount, CustodialAccountType } from './entities/custodial-account.entity';
import { SettlementBatch } from './entities/settlement-batch.entity';
import { ReportExport } from './entities/report-export.entity';
import { RolePermission } from './entities/role-permission.entity';
import { SystemAlert, AlertType, AlertSeverity } from './entities/system-alert.entity';
import { Collection, CollectionStatus } from './entities/collection.entity';
import { BranchTarget, TargetMetric, TargetPeriod } from './entities/branch-target.entity';
import { BranchExpense } from './entities/branch-expense.entity';
import { Meeting } from './entities/meeting.entity';
import { Attendance } from './entities/attendance.entity';
import { SupportTicket, TicketStatus } from './entities/support-ticket.entity';
import { Guarantor } from './entities/guarantor.entity';
import { Beneficiary } from './entities/beneficiary.entity';
import { NextOfKin } from './entities/next-of-kin.entity';
import { BankAccount } from './entities/bank-account.entity';
import { EmailLog } from './entities/email-log.entity';
import { OtpCode } from './entities/otp-code.entity';
import { SmsLog } from './entities/sms-log.entity';
import { UserTour } from './entities/user-tour.entity';
import { EmpowermentProgram } from './entities/empowerment-program.entity';
import { ProgramApplication } from './entities/program-application.entity';

import * as bcrypt from 'bcrypt';

async function run() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: +(process.env.DB_PORT || 5432),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'postgres',
    database: process.env.DB_NAME || 'postgres',
    ssl: { rejectUnauthorized: false },
    entities: [
      Organisation, User, Wallet, Ledger, Loan, Approval,
      Group, Member, LoanRepayment, ApprovalLog, Contribution,
      Notification, Audit, SystemConfig,
      Branch, Product, KycDocument, Transaction,
      ContributionPeriod, RepaymentSchedule, ProductSubscription,
      AdminSession, ApprovalWorkflowConfig, CustodialAccount,
      SettlementBatch, ReportExport, RolePermission, SystemAlert,
      Collection, BranchTarget, BranchExpense,
      Meeting, Attendance, SupportTicket, Guarantor, Beneficiary,
      NextOfKin, BankAccount, EmailLog, OtpCode, SmsLog, UserTour,
      EmpowermentProgram, ProgramApplication
    ],
    synchronize: true,
    logging: true,
  });

  console.log('Starting Grand Seed Execution...');

  try {
    await dataSource.initialize();
    console.log('Database Connected Successfully');

    const orgRepo = dataSource.getRepository(Organisation);
    const userRepo = dataSource.getRepository(User);
    const groupRepo = dataSource.getRepository(Group);
    const memberRepo = dataSource.getRepository(Member);
    const walletRepo = dataSource.getRepository(Wallet);
    const configRepo = dataSource.getRepository(SystemConfig);

    // Helper for unique codes
    const generateOrgCode = async (type: OrganisationType | string) => {
      const prefix = type === OrganisationType.PARTNER ? 'ORG' : type === OrganisationType.SUB_ORG ? 'SUB' : 'GRP';
      const lastOrg = await orgRepo.findOne({
        where: { type: type as any },
        order: { id: 'DESC' }
      });
      const lastId = lastOrg ? lastOrg.id : 0;
      return `${prefix}-${(lastId + 1).toString().padStart(4, '0')}`;
    };

    // 1. Root Organisation (APEX)
    let apex = await orgRepo.findOne({ where: { type: OrganisationType.APEX } });
    if (!apex) {
      apex = orgRepo.create({ 
        name: 'NOGALSS Apex', 
        type: OrganisationType.APEX, 
        status: 'active',
        code: 'APEX-0001' 
      });
      await orgRepo.save(apex);
    }

    // 2. Super Admin
    const superAdminEmail = 'admin@nogalss.org';
    let superAdmin = await userRepo.findOne({ where: { email: superAdminEmail } });
    if (!superAdmin) {
      superAdmin = userRepo.create({
        name: 'Ultimate Super Admin',
        email: superAdminEmail,
        password: await bcrypt.hash('password123', 10),
        role: UserRole.SUPER_ADMIN,
        organisation: apex,
      });
      await userRepo.save(superAdmin);
    }

    // 3. Partner Organisation
    let partner = await orgRepo.findOne({ where: { type: OrganisationType.PARTNER } });
    if (!partner) {
      partner = orgRepo.create({ 
        name: 'Federal Cooperative Partner', 
        type: OrganisationType.PARTNER, 
        parent: apex,
        status: 'active',
        code: await generateOrgCode(OrganisationType.PARTNER)
      });
      await orgRepo.save(partner);
    }

    // 4. Sub-Organisation
    let subOrg = await orgRepo.findOne({ where: { type: OrganisationType.SUB_ORG, name: 'Abuja Regional Branch' } });
    if (!subOrg) {
      subOrg = orgRepo.create({ 
        name: 'Abuja Regional Branch', 
        type: OrganisationType.SUB_ORG, 
        parent: partner,
        status: 'active',
        code: await generateOrgCode(OrganisationType.SUB_ORG)
      });
      await orgRepo.save(subOrg);
    }

    // 5. Group
    let group = await groupRepo.findOne({ where: { name: 'Farmers Prosperity Group' } });
    if (!group) {
      group = groupRepo.create({
        name: 'Farmers Prosperity Group',
        organisationId: subOrg.id,
        category: 'Agricultural',
        status: 'active'
      });
      await groupRepo.save(group);
    }

    // 6. Member User & Profile
    const memberEmail = 'member@example.com';
    let memberUser = await userRepo.findOne({ where: { email: memberEmail } });
    if (!memberUser) {
      memberUser = userRepo.create({
        name: 'John Member Doe',
        email: memberEmail,
        password: await bcrypt.hash('password123', 10),
        role: UserRole.MEMBER,
        organisation: subOrg
      });
      await userRepo.save(memberUser);

      // Create Member Wallet
      const memberWallet = walletRepo.create({
        type: WalletType.MEMBER,
        balance: 50000,
        currency: 'NGN',
        ownerId: memberUser.id,
        ownerType: WalletType.MEMBER
      });
      await walletRepo.save(memberWallet);

      // Create Member Profile
      const memberProfile = memberRepo.create({
        userId: memberUser.id,
        groupId: group.id,
        walletId: memberWallet.id,
        kycStatus: 'verified',
        status: 'active'
      });
      await memberRepo.save(memberProfile);
    }

    // 7. Example Partner Admin
    const partnerEmail = 'partner@example.com';
    if (!(await userRepo.findOne({ where: { email: partnerEmail } }))) {
      const partnerAdmin = userRepo.create({
        name: 'Grace Partner Admin',
        email: partnerEmail,
        password: await bcrypt.hash('password123', 10),
        role: UserRole.PARTNER_ADMIN,
        organisation: partner
      });
      await userRepo.save(partnerAdmin);
    }

    // Additional Apex Admins
    if (!(await userRepo.findOne({ where: { email: 'finance@nogalss.org' } }))) {
      const financeAdmin = userRepo.create({
        name: 'Apex Finance Admin',
        email: 'finance@nogalss.org',
        password: await bcrypt.hash('password123', 10),
        role: UserRole.FINANCE_ADMIN,
        organisation: apex,
      });
      await userRepo.save(financeAdmin);
    }

    if (!(await userRepo.findOne({ where: { email: 'auditor@nogalss.org' } }))) {
      const auditor = userRepo.create({
        name: 'Apex Compliance Auditor',
        email: 'auditor@nogalss.org',
        password: await bcrypt.hash('password123', 10),
        role: UserRole.AUDITOR,
        organisation: apex,
      });
      await userRepo.save(auditor);
    }

    // System Configurations
    const configs = [
      { key: 'LOAN_INTEREST_RATE', value: '5.0', description: 'Annual interest rate for loans (%)' },
      { key: 'MAX_LOAN_AMOUNT', value: '5000000', description: 'Maximum individual loan amount' },
      { key: 'MIN_SAVINGS_BALANCE', value: '1000', description: 'Minimum balance to keep account active' },
      { key: 'APPROVAL_THRESHOLD_PEER', value: '100000', description: 'Automatic approval limit' },
    ];
    for (const c of configs) {
      // Check if config already exists to prevent duplicates on re-run
      const existingConfig = await configRepo.findOne({ where: { key: c.key } });
      if (!existingConfig) {
        await configRepo.save(configRepo.create(c));
      }
    }

    // =========================================================
    // 8. PARTNER MODULE DATA: Branches, Products, KYC, Transactions
    // =========================================================
    const branchRepo = dataSource.getRepository(Branch);
    const productRepo = dataSource.getRepository(Product);
    const kycRepo = dataSource.getRepository(KycDocument);
    const txnRepo = dataSource.getRepository(Transaction);
    const periodRepo = dataSource.getRepository(ContributionPeriod);
    const scheduleRepo = dataSource.getRepository(RepaymentSchedule);
    const subscriptionRepo = dataSource.getRepository(ProductSubscription);

    // Branches under the partner organisation
    const branchDefs = [
      { name: 'Abuja Branch', city: 'Abuja', state: 'FCT', address: '14 Cooperative House, Maitama', phone: '09080001001', email: 'abuja@fedcoop.ng' },
      { name: 'Lagos Branch', city: 'Lagos', state: 'Lagos', address: '3 Broad Street, Lagos Island', phone: '09080001002', email: 'lagos@fedcoop.ng' },
      { name: 'Kano Branch', city: 'Kano', state: 'Kano', address: '11 Nassarawa Road, Kano', phone: '09080001003', email: 'kano@fedcoop.ng' },
    ];
    for (const def of branchDefs) {
      const exists = await branchRepo.findOne({ where: { name: def.name, organisationId: partner.id } });
      if (!exists) await branchRepo.save(branchRepo.create({ ...def, organisationId: partner.id, status: 'active' }));
    }
    console.log('Branches seeded.');

    // Seed Sub-Org Users and Link existing Member/Group to a Branch
    const abujaBranch = await branchRepo.findOne({ where: { name: 'Abuja Branch', organisationId: partner.id } });
    if (abujaBranch) {
      if (!(await userRepo.findOne({ where: { email: 'suborg_admin@example.com' } }))) {
        await userRepo.save(userRepo.create({
          name: 'Abuja Branch Admin',
          email: 'suborg_admin@example.com',
          password: await bcrypt.hash('password123', 10),
          role: UserRole.SUB_ORG_ADMIN,
          organisation: partner,
          branchId: abujaBranch.id
        }));
      }

      if (!(await userRepo.findOne({ where: { email: 'suborg_officer@example.com' } }))) {
        await userRepo.save(userRepo.create({
          name: 'Abuja Branch Officer',
          email: 'suborg_officer@example.com',
          password: await bcrypt.hash('password123', 10),
          role: UserRole.SUB_ORG_OFFICER,
          organisation: partner,
          branchId: abujaBranch.id
        }));
      }

      // Link member to branch if not already linked
      const memberRec = await memberRepo.findOne({ where: { userId: (await userRepo.findOne({ where: { email: 'member@example.com' } }))?.id } });
      if (memberRec && !memberRec.branchId) {
        memberRec.branchId = abujaBranch.id;
        await memberRepo.save(memberRec);
      }

      // Seed a sub-org group attached to the branch
      let subGroup = await groupRepo.findOne({ where: { name: 'Abuja Cooperative Cell 1' } });
      if (!subGroup) {
        subGroup = groupRepo.create({
          name: 'Abuja Cooperative Cell 1',
          organisationId: partner.id,
          branchId: abujaBranch.id,
          category: 'General',
          status: 'active'
        });
        await groupRepo.save(subGroup);
      }

      // Seed Group Treasurer and Secretary
      if (!(await userRepo.findOne({ where: { email: 'treasurer@example.com' } }))) {
        await userRepo.save(userRepo.create({
          name: 'Abuja Group Treasurer',
          email: 'treasurer@example.com',
          password: await bcrypt.hash('password123', 10),
          role: UserRole.GROUP_TREASURER,
          organisation: partner,
          branchId: abujaBranch.id
        }));
      }

      if (!(await userRepo.findOne({ where: { email: 'secretary@example.com' } }))) {
        await userRepo.save(userRepo.create({
          name: 'Abuja Group Secretary',
          email: 'secretary@example.com',
          password: await bcrypt.hash('password123', 10),
          role: UserRole.GROUP_SECRETARY,
          organisation: partner,
          branchId: abujaBranch.id
        }));
      }
    }

    // Cooperative Products
    const productDefs = [
      { name: 'Monthly Savings Plan', type: ProductType.SAVINGS, interestRate: 4.0, minAmount: 5000, maxAmount: 500000, minTenureMonths: 1, maxTenureMonths: 0, eligibilityCriteria: 'All verified members', requiresKyc: true, status: ProductStatus.ACTIVE },
      { name: 'Emergency Loan', type: ProductType.LOAN, interestRate: 5.0, minAmount: 10000, maxAmount: 200000, minTenureMonths: 3, maxTenureMonths: 6, eligibilityCriteria: '6+ months membership', requiresKyc: true, status: ProductStatus.ACTIVE },
      { name: 'Business Development Loan', type: ProductType.LOAN, interestRate: 6.0, minAmount: 100000, maxAmount: 2000000, minTenureMonths: 12, maxTenureMonths: 36, eligibilityCriteria: 'Minimum 1 year + verified KYC', requiresKyc: true, status: ProductStatus.ACTIVE },
      { name: 'Agricultural Support Grant', type: ProductType.SERVICE, interestRate: 0, minAmount: 0, maxAmount: 500000, minTenureMonths: 0, maxTenureMonths: 0, eligibilityCriteria: 'Agricultural group members only', requiresKyc: false, status: ProductStatus.ACTIVE },
      { name: 'Group Micro-Insurance', type: ProductType.INSURANCE, interestRate: 2.0, minAmount: 1000, maxAmount: 50000, minTenureMonths: 12, maxTenureMonths: 12, eligibilityCriteria: 'All members with active savings', requiresKyc: false, status: ProductStatus.DRAFT },
    ];
    for (const def of productDefs) {
      const exists = await productRepo.findOne({ where: { name: def.name, organisationId: partner.id } });
      if (!exists) await productRepo.save(productRepo.create({ ...def, organisationId: partner.id }));
    }
    console.log('Products seeded.');

    // KYC Documents for member
    const memberRecord = await memberRepo.findOne({ where: { userId: (await userRepo.findOne({ where: { email: 'member@example.com' } }))?.id } });
    if (memberRecord) {
      const kycDefs = [
        { documentType: KycDocumentType.NIN, documentNumber: '12345678901', documentFileName: 'nin_john_doe.jpg', status: KycStatus.APPROVED },
        { documentType: KycDocumentType.UTILITY_BILL, documentNumber: null, documentFileName: 'utility_bill_march.pdf', status: KycStatus.APPROVED },
      ];
      for (const def of kycDefs) {
        const exists = await kycRepo.findOne({ where: { memberId: memberRecord.id, documentType: def.documentType } });
        if (!exists) {
          await kycRepo.save(kycRepo.create({ ...def, memberId: memberRecord.id, organisationId: partner.id }));
        }
      }
      console.log('KYC documents seeded.');

      // Sample Transactions
      const partnerWallet = await walletRepo.findOne({ where: { ownerId: partner.id, type: WalletType.PARTNER } });
      const memberWallet = await walletRepo.findOne({ where: { id: memberRecord.walletId } });
      if (partnerWallet && memberWallet) {
        const txns = [
          { reference: 'TXN-20260310-001', type: TransactionType.CONTRIBUTION, amount: 10000, status: TransactionStatus.COMPLETED, channel: TransactionChannel.BANK_TRANSFER, fromWalletId: memberWallet.id, toWalletId: partnerWallet.id, memberId: memberRecord.id, organisationId: partner.id, branchId: abujaBranch?.id, description: 'Monthly contribution â€“ March 2026', balanceBefore: 60000, balanceAfter: 50000 },
          { reference: 'TXN-20260310-002', type: TransactionType.LOAN_DISBURSEMENT, amount: 250000, status: TransactionStatus.COMPLETED, channel: TransactionChannel.BANK_TRANSFER, fromWalletId: partnerWallet.id, toWalletId: memberWallet.id, memberId: memberRecord.id, organisationId: partner.id, branchId: abujaBranch?.id, description: 'Emergency Loan Disbursement', balanceBefore: 500000, balanceAfter: 250000 },
          { reference: 'TXN-20260308-003', type: TransactionType.LOAN_REPAYMENT, amount: 22500, status: TransactionStatus.COMPLETED, channel: TransactionChannel.CASH, fromWalletId: memberWallet.id, toWalletId: partnerWallet.id, memberId: memberRecord.id, organisationId: partner.id, branchId: abujaBranch?.id, description: 'Loan repayment â€“ March installment', balanceBefore: 50000, balanceAfter: 27500 },
        ];
        for (const txnData of txns) {
          const exists = await txnRepo.findOne({ where: { reference: txnData.reference } });
          if (!exists) {
            const txn = await txnRepo.save(txnRepo.create(txnData));
            // Matching Ledger
            await dataSource.getRepository(Ledger).save({
              sourceWallet: { id: txnData.fromWalletId },
              destinationWallet: { id: txnData.toWalletId },
              amount: txnData.amount,
              sourceBalanceAfter: txnData.balanceAfter,
              destinationBalanceAfter: txnData.balanceAfter + txnData.amount, // Simplified for seed
              transactionId: txn.id,
              type: txnData.type,
              description: txnData.description,
              reference: txnData.reference,
              status: 'completed'
            });
          }
        }
        console.log('Transactions seeded.');

        // 8.1 NEW SUB-ORG OPERATIONAL DATA: Collection, Target, Expense
        const collectionRepo = dataSource.getRepository(Collection);
        const targetRepo = dataSource.getRepository(BranchTarget);
        const expenseRepo = dataSource.getRepository(BranchExpense);

        if (abujaBranch && (await userRepo.findOne({ where: { email: 'suborg_officer@example.com' } }))) {
          const officer = await userRepo.findOne({ where: { email: 'suborg_officer@example.com' } });
          
          // Collection
          if (officer) {
            const collectionExists = await collectionRepo.findOne({ where: { officerId: officer.id, branchId: abujaBranch.id } });
            if (!collectionExists) {
              await collectionRepo.save(collectionRepo.create({
                amount: 15000,
                officerId: officer.id,
                branchId: abujaBranch.id,
                organisationId: partner.id,
                status: CollectionStatus.PENDING_SYNC,
                collectedAt: new Date()
              }));
            }
          }

          // Branch Target
          const targetExists = await targetRepo.findOne({ where: { branchId: abujaBranch.id, metricType: TargetMetric.COLLECTION } });
          if (!targetExists) {
            await targetRepo.save(targetRepo.create({
              targetAmount: 5000000,
              metricType: TargetMetric.COLLECTION,
              period: TargetPeriod.MONTHLY,
              startDate: new Date('2026-03-01'),
              endDate: new Date('2026-03-31'),
              branchId: abujaBranch.id,
              status: 'active'
            }));
          }

          // Branch Expense
          const expenseExists = await expenseRepo.findOne({ where: { branchId: abujaBranch.id, category: 'Stationery' } });
          if (!expenseExists && officer) {
            await expenseRepo.save(expenseRepo.create({
              amount: 2500,
              category: 'Stationery',
              description: 'Printer ink and paper for branch office',
              branchId: abujaBranch.id,
              organisationId: partner.id,
              recordedById: officer.id,
              status: 'approved'
            }));
          }
        }
        console.log('Sub-Org Operational data seeded.');
      }

      // Contribution Period
      const periodExists = await periodRepo.findOne({ where: { name: 'March 2026 Monthly Contribution', organisationId: partner.id } });
      if (!periodExists) {
        await periodRepo.save(periodRepo.create({
          name: 'March 2026 Monthly Contribution',
          startDate: new Date('2026-03-01'),
          endDate: new Date('2026-03-31'),
          targetAmountPerMember: 10000,
          organisationId: partner.id,
          status: PeriodStatus.OPEN,
        }));
      }
      console.log('Contribution period seeded.');
    }

    // =========================================================
    // 9. ADMIN MODULE DATA: RBAC, Workflow Configs, Custodial Accounts, Alerts
    // =========================================================
    const permRepo = dataSource.getRepository(RolePermission);
    const workflowRepo = dataSource.getRepository(ApprovalWorkflowConfig);
    const custodialRepo = dataSource.getRepository(CustodialAccount);
    const alertRepo = dataSource.getRepository(SystemAlert);

    // Role Permissions (RBAC)
    const permissions = [
      // Super Admin â€” full access
      { role: 'super_admin', resource: 'organisations', action: 'create', allowed: true, isSystemDefault: true },
      { role: 'super_admin', resource: 'organisations', action: 'suspend', allowed: true, isSystemDefault: true },
      { role: 'super_admin', resource: 'settlements', action: 'approve', allowed: true, isSystemDefault: true },
      { role: 'super_admin', resource: 'system_config', action: 'configure', allowed: true, isSystemDefault: true },
      { role: 'super_admin', resource: 'members', action: 'freeze', allowed: true, isSystemDefault: true },
      // Finance Admin
      { role: 'finance_admin', resource: 'loans', action: 'approve', allowed: true, isSystemDefault: true },
      { role: 'finance_admin', resource: 'transactions', action: 'read', allowed: true, isSystemDefault: true },
      { role: 'finance_admin', resource: 'settlements', action: 'read', allowed: true, isSystemDefault: true },
      { role: 'finance_admin', resource: 'system_config', action: 'configure', allowed: false, isSystemDefault: true },
      // Auditor â€” read-only
      { role: 'auditor', resource: 'audit_logs', action: 'read', allowed: true, isSystemDefault: true },
      { role: 'auditor', resource: 'transactions', action: 'read', allowed: true, isSystemDefault: true },
      { role: 'auditor', resource: 'reports', action: 'export', allowed: true, isSystemDefault: true },
      { role: 'auditor', resource: 'organisations', action: 'create', allowed: false, isSystemDefault: true },
      // Partner Admin
      { role: 'partner_admin', resource: 'members', action: 'create', allowed: true, isSystemDefault: true },
      { role: 'partner_admin', resource: 'loans', action: 'approve', allowed: true, isSystemDefault: true },
      { role: 'partner_admin', resource: 'products', action: 'create', allowed: true, isSystemDefault: true },
      { role: 'partner_admin', resource: 'settlements', action: 'approve', allowed: false, isSystemDefault: true },
      // Sub-Org Admin
      { role: 'sub_org_admin', resource: 'members', action: 'create', allowed: true, isSystemDefault: true },
      { role: 'sub_org_admin', resource: 'loans', action: 'create', allowed: true, isSystemDefault: true },
      { role: 'sub_org_admin', resource: 'reports', action: 'export', allowed: true, isSystemDefault: true },
      { role: 'sub_org_admin', resource: 'products', action: 'create', allowed: false, isSystemDefault: true },
      // Sub-Org Officer
      { role: 'sub_org_officer', resource: 'members', action: 'create', allowed: true, isSystemDefault: true },
      { role: 'sub_org_officer', resource: 'loans', action: 'approve', allowed: false, isSystemDefault: true },
      // Group Admin
      { role: 'group_admin', resource: 'members', action: 'create', allowed: true, isSystemDefault: true },
      { role: 'group_admin', resource: 'members', action: 'update', allowed: true, isSystemDefault: true },
      // Group Treasurer
      { role: 'group_treasurer', resource: 'transactions', action: 'create', allowed: true, isSystemDefault: true },
      { role: 'group_treasurer', resource: 'contributions', action: 'create', allowed: true, isSystemDefault: true },
      // Group Secretary
      { role: 'group_secretary', resource: 'members', action: 'read', allowed: true, isSystemDefault: true },
      { role: 'group_secretary', resource: 'members', action: 'update', allowed: true, isSystemDefault: true, description: 'Track attendance and participation' },
      { role: 'group_secretary', resource: 'reports', action: 'read', allowed: true, isSystemDefault: true },
    ];
    for (const p of permissions) {
      const exists = await permRepo.findOne({ where: { role: p.role, resource: p.resource, action: p.action } });
      if (!exists) await permRepo.save(permRepo.create(p));
    }
    // 12. Approval Workflows
    const apexUser = await dataSource.getRepository(User).findOne({ where: { email: 'admin@nogalss.org' } });
    if (apexUser) {
      const workflows = [
        {
          workflowType: WorkflowType.LOAN_APPROVAL,
          scope: WorkflowScope.APEX,
          minAmount: 0, maxAmount: 500000,
          levelCount: 1,
          levels: [{ level: 1, requiredRole: 'sub_org_admin', label: 'Sub-Org Approval' }],
          autoEscalate: true, escalationHours: 48,
          isActive: true, createdBy: apexUser.id,
          description: 'Standard group-to-suborg loan approval',
        },
        {
          workflowType: WorkflowType.LOAN_APPROVAL,
          scope: WorkflowScope.APEX,
          minAmount: 500001, maxAmount: null,
          levelCount: 2,
          levels: [
            { level: 1, requiredRole: 'finance_admin', label: 'Finance Admin Review' },
            { level: 2, requiredRole: 'super_admin', label: 'Super Admin Final Approval' },
          ],
          autoEscalate: true, escalationHours: 24,
          isActive: true, createdBy: apexUser.id,
          description: 'Two-level approval for loans above â‚¦500,000',
        },
        {
          workflowType: WorkflowType.SETTLEMENT,
          scope: WorkflowScope.APEX,
          minAmount: 0, maxAmount: null,
          levelCount: 2,
          levels: [
            { level: 1, requiredRole: 'finance_admin', label: 'Finance Admin Verification' },
            { level: 2, requiredRole: 'super_admin', label: 'Super Admin Authorization' },
          ],
          autoEscalate: false, escalationHours: 24,
          isActive: true, createdBy: apexUser.id,
          description: 'All settlements require Finance Admin + Super Admin approval',
        },
        {
          workflowType: WorkflowType.WITHDRAWAL,
          scope: WorkflowScope.APEX,
          minAmount: 100000, maxAmount: null,
          levelCount: 1,
          levels: [{ level: 1, requiredRole: 'finance_admin', label: 'Finance Admin Authorization' }],
          autoEscalate: true, escalationHours: 48,
          isActive: true, createdBy: apexUser.id,
          description: 'Withdrawals above â‚¦100,000 require Finance Admin approval',
        },
      ];
      for (const w of workflows) {
        const exists = await workflowRepo.findOne({ where: { workflowType: w.workflowType, scope: w.scope, minAmount: w.minAmount } });
        if (!exists) await workflowRepo.save(workflowRepo.create(w as any));
      }
      console.log('Approval workflow configs seeded.');
    }

    // Custodial Accounts (Apex institutional accounts)
    const custodials = [
      { name: 'NOGALSS National Reserve Fund', type: CustodialAccountType.RESERVE_FUND, balance: 150000000, bankName: 'First Bank Nigeria', bankAccountNumber: '2001234567', bankAccountName: 'NOGALSS National Reserve', description: 'Primary apex reserve fund' },
      { name: 'Settlement Clearing Pool', type: CustodialAccountType.SETTLEMENT_POOL, balance: 35000000, bankName: 'GTBank', bankAccountNumber: '0123456789', bankAccountName: 'NOGALSS Settlement Pool', description: 'Holds funds during inter-org settlement processing' },
      { name: 'National Loan Capital Pool', type: CustodialAccountType.LOAN_POOL, balance: 85000000, bankName: 'UBA', bankAccountNumber: '3012345678', bankAccountName: 'NOGALSS Loan Capital', description: 'Aggregated loan capital deployed across partner network' },
      { name: 'NOGALSS Operating Account', type: CustodialAccountType.APEX_OPERATING, balance: 8200000, bankName: 'Zenith Bank', bankAccountNumber: '1012345678', bankAccountName: 'NOGALSS Operations', description: 'Day-to-day operational expenses for national office' },
    ];
    for (const c of custodials) {
      const exists = await custodialRepo.findOne({ where: { name: c.name } });
      if (!exists) await custodialRepo.save(custodialRepo.create(c));
    }
    console.log('Custodial accounts seeded.');

    // System Alerts
    const alerts = [
      { type: AlertType.LARGE_TRANSACTION, severity: AlertSeverity.WARNING, title: 'Large transaction pending review', message: 'A â‚¦2,000,000 withdrawal request from Lagos State Coop is awaiting Finance Admin approval.', relatedEntityType: 'transaction', relatedEntityId: 1 },
      { type: AlertType.KYC_EXPIRY, severity: AlertSeverity.INFO, title: '3 member KYC documents expiring soon', message: 'NIN documents for 3 members under Federal Cooperative Partner expire within 30 days.', relatedEntityType: 'kyc_document' },
      { type: AlertType.LOAN_DEFAULT, severity: AlertSeverity.CRITICAL, title: 'Loan default detected', message: 'Member Chukwuemeka Obi has missed 2 consecutive repayments on LN-003. Immediate action required.', relatedEntityType: 'loan' },
    ];
    for (const a of alerts) {
      const exists = await alertRepo.findOne({ where: { title: a.title } });
      if (!exists) await alertRepo.save(alertRepo.create(a as any));
    }
    console.log('System alerts seeded.');

    // System Config (Paystack)
    const paystackConfigs = [
      { key: 'paystack.secret_key', value: '', category: 'paystack', description: 'Paystack Secret Key (sk_test_... or sk_live_...)' },
      { key: 'paystack.public_key', value: '', category: 'paystack', description: 'Paystack Public Key (pk_test_... or pk_live_...)' },
      { key: 'paystack.base_url', value: 'https://api.paystack.co', category: 'paystack', description: 'Paystack API Base URL' },
      { key: 'paystack.preferred_bank', value: 'access-bank', category: 'paystack', description: 'Preferred bank for dedicated virtual accounts' },
      { key: 'paystack.enabled', value: 'false', category: 'paystack', description: 'Enable/Disable Paystack integration' },
    ];
    const systemConfigRepo = dataSource.getRepository(SystemConfig);
    for (const c of paystackConfigs) {
      const exists = await systemConfigRepo.findOne({ where: { key: c.key } });
      if (!exists) await systemConfigRepo.save(systemConfigRepo.create(c as any));
    }
    console.log('Paystack system configs seeded.');

    // 13. Grassroots & Support Operations
    const meetingRepo = dataSource.getRepository(Meeting);
    const attendanceRepo = dataSource.getRepository(Attendance);
    const ticketRepo = dataSource.getRepository(SupportTicket);
    const guarantorRepo = dataSource.getRepository(Guarantor);
    const beneficiaryRepo = dataSource.getRepository(Beneficiary);

    const firstGroup = await dataSource.getRepository(Group).findOne({ where: { name: 'Farmers Prosperity Group' } });
    const firstMember = await dataSource.getRepository(Member).findOne({ where: { kycStatus: 'verified' } });

    if (firstGroup && firstMember) {
      // Meetings
      const meeting = await meetingRepo.save(meetingRepo.create({
        title: 'Monthly Savings Group Meeting',
        description: 'Monthly contribution and loan review session',
        date: new Date(),
        location: 'Abuja Branch Hall',
        groupId: firstGroup.id,
        status: 'scheduled'
      }));
      console.log('Sample meeting seeded.');

      // Attendance
      await attendanceRepo.save(attendanceRepo.create({
        meetingId: meeting.id,
        memberId: firstMember.id,
        status: 'present',
        remarks: 'Confirmed savings contribution'
      }));
      console.log('Sample attendance seeded.');

      // Support Ticket
      await ticketRepo.save(ticketRepo.create({
        memberId: firstMember.id,
        subject: 'Mobile app login issue',
        description: 'Cannot reset password via email link',
        priority: 'high',
        status: TicketStatus.OPEN,
        category: 'technical'
      }));
      console.log('Sample support ticket seeded.');

      // Beneficiary
      await beneficiaryRepo.save(beneficiaryRepo.create({
        memberId: firstMember.id,
        name: 'Grace Obi',
        relationship: 'spouse',
        phone: '08012345678',
        percentageShare: 100
      }));
      console.log('Sample beneficiary seeded.');

      // Guarantor (for the first active loan)
      const firstLoan = await dataSource.getRepository(Loan).findOne({ where: { status: 'active' as any } });
      if (firstLoan) {
        await guarantorRepo.save(guarantorRepo.create({
          loanId: firstLoan.id,
          memberId: firstMember.id,
          status: 'accepted',
          guaranteeAmount: 50000
        }));
        console.log('Sample guarantor seeded.');
      }
    }

    console.log('Grand Seed: Data synchronized and populated.');

  } catch (err) {
    console.error('Fatal Seeding Error:', err);
  } finally {
    await dataSource.destroy();
  }
}

run();

