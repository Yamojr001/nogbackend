import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankAccount, OwnerType } from '../entities/bank-account.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class BankAccountService {
  constructor(
    @InjectRepository(BankAccount)
    private readonly bankAccountRepo: Repository<BankAccount>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async addMemberBankAccount(userId: number, dto: {
    accountName: string;
    bankName: string;
    accountNumber: string;
    bankCode?: string;
    bvn?: string;
  }) {
    // Check if account number already exists for this user
    const existing = await this.bankAccountRepo.findOne({
      where: {
        ownerId: userId,
        ownerType: OwnerType.MEMBER,
        accountNumber: dto.accountNumber,
      },
    });

    if (existing) {
      throw new BadRequestException('This bank account is already connected to your profile.');
    }

    const bankAccount = this.bankAccountRepo.create({
      ownerId: userId,
      ownerType: OwnerType.MEMBER,
      accountName: dto.accountName,
      bankName: dto.bankName,
      accountNumber: dto.accountNumber,
      bvn: dto.bvn,
      isVerified: true, // We assume it's verified if they are adding it, or we could add a validation step later
    });

    return this.bankAccountRepo.save(bankAccount);
  }

  async getMemberBankAccounts(userId: number) {
    return this.bankAccountRepo.find({
      where: {
        ownerId: userId,
        ownerType: OwnerType.MEMBER,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async removeMemberBankAccount(userId: number, accountId: number) {
    const account = await this.bankAccountRepo.findOne({
      where: {
        id: accountId,
        ownerId: userId,
        ownerType: OwnerType.MEMBER,
      },
    });

    if (!account) {
      throw new NotFoundException('Bank account not found');
    }

    await this.bankAccountRepo.remove(account);
    return { success: true, message: 'Bank account removed successfully' };
  }
}
