import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ledger, TransactionType } from '../entities/ledger.entity';
import * as crypto from 'crypto';

@Injectable()
export class LedgerService {
  constructor(
    @InjectRepository(Ledger)
    private ledgerRepository: Repository<Ledger>,
  ) {}

  async createTransaction(
    sourceWalletId: number,
    destinationWalletId: number,
    amount: number,
    type: string,
    description: string,
    reference?: string
  ): Promise<Ledger> {
    if (amount <= 0) throw new Error('Amount must be greater than zero');
    if (sourceWalletId === destinationWalletId) throw new Error('Cannot transfer to the same wallet');

    const entry = this.ledgerRepository.create({
      sourceWallet: { id: sourceWalletId } as any,
      destinationWallet: { id: destinationWalletId } as any,
      type,
      amount,
      description,
      status: 'completed',
      reference,
    });

    return this.ledgerRepository.save(entry);
  }

  async findAll(): Promise<Ledger[]> {
    return this.ledgerRepository.find({ relations: ['sourceWallet', 'destinationWallet'] });
  }

  async findOne(id: number): Promise<Ledger> {
    return this.ledgerRepository.findOne({ where: { id }, relations: ['sourceWallet', 'destinationWallet'] });
  }

  async findByWallet(walletId: number): Promise<any[]> {
    const entries = await this.ledgerRepository.find({
      where: [
        { sourceWallet: { id: walletId } },
        { destinationWallet: { id: walletId } }
      ],
      relations: ['sourceWallet', 'destinationWallet'],
      order: { createdAt: 'DESC' }
    });

    return entries.map(entry => {
      const isSource = entry.sourceWallet?.id === walletId;
      return {
        id: entry.id,
        date: entry.createdAt,
        reference: entry.reference,
        description: entry.description,
        type: entry.type,
        debit: isSource ? entry.amount : 0,
        credit: !isSource ? entry.amount : 0,
        balance: isSource ? entry.sourceBalanceAfter : entry.destinationBalanceAfter,
        status: entry.status,
      };
    });
  }
}
