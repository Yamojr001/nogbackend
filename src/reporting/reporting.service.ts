import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';
import { Member } from '../entities/member.entity';
import { Organisation } from '../entities/organisation.entity';
import PDFDocument from 'pdfkit';

@Injectable()
export class ReportingService {
  constructor(
    @InjectRepository(Transaction) private txnRepo: Repository<Transaction>,
    @InjectRepository(Member) private memberRepo: Repository<Member>,
    @InjectRepository(Organisation) private orgRepo: Repository<Organisation>,
  ) {}

  async exportTransactionsCsv(): Promise<string> {
    const txns = await this.txnRepo.find({ relations: ['fromWallet', 'toWallet'] });
    const header = 'Reference,Type,Amount,Status,From,To,Date\n';
    const rows = txns.map(t => 
      `${t.reference},${t.type},${t.amount},${t.status},${t.fromWalletId || ''},${t.toWalletId || ''},${t.createdAt.toISOString()}`
    ).join('\n');
    return header + rows;
  }

  async exportMembersCsv(): Promise<string> {
    const members = await this.memberRepo.find({ relations: ['user'] });
    const header = 'Name,Email,Phone,Joined Date,Status\n';
    const rows = members.map(m => 
      `${m.user?.name || ''},${m.user?.email || ''},${m.user?.phone || ''},${m.joinedDate.toISOString()},${m.status}`
    ).join('\n');
    return header + rows;
  }

  async exportTransactionsPdf(): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      const txns = await this.txnRepo.find({ order: { createdAt: 'DESC' }, take: 100 });
      const doc = new PDFDocument({ margin: 50 });
      const chunks: any[] = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('NOGALSS Cooperative - Transaction Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'right' });
      doc.moveDown();

      // Table Header
      const tableTop = 150;
      doc.font('Helvetica-Bold');
      doc.text('Reference', 50, tableTop);
      doc.text('Type', 150, tableTop);
      doc.text('Amount', 250, tableTop);
      doc.text('Status', 350, tableTop);
      doc.text('Date', 450, tableTop);

      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
      doc.font('Helvetica');

      let y = tableTop + 30;
      txns.forEach(t => {
        if (y > 700) { doc.addPage(); y = 50; }
        doc.text(t.reference.substring(0, 12), 50, y);
        doc.text(t.type, 150, y);
        doc.text(`N${t.amount.toLocaleString()}`, 250, y);
        doc.text(t.status, 350, y);
        doc.text(t.createdAt.toLocaleDateString(), 450, y);
        y += 20;
      });

      doc.end();
    });
  }

  async generateTransactionReceipt(id: number): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      const t = await this.txnRepo.findOne({ where: { id }, relations: ['fromWallet', 'toWallet'] });
      if (!t) return reject(new Error('Transaction not found'));

      const doc = new PDFDocument({ size: 'A5', margin: 30 });
      const chunks: any[] = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Logo/Header
      doc.fontSize(16).text('NOGALSS Cooperative', { align: 'center' });
      doc.fontSize(10).text('TRANSACTION RECEIPT', { align: 'center' });
      doc.moveDown();
      doc.moveTo(30, doc.y).lineTo(doc.page.width - 30, doc.y).stroke();
      doc.moveDown();

      const details = [
        ['Reference', t.reference],
        ['Type', t.type],
        ['Amount', `N${t.amount.toLocaleString()}`],
        ['Status', t.status],
        ['Date', t.createdAt.toLocaleString()],
        ['Description', t.description || 'N/A']
      ];

      details.forEach(([label, value]) => {
        doc.font('Helvetica-Bold').text(`${label}:`, 50, doc.y, { continued: true });
        doc.font('Helvetica').text(` ${value}`, 150, doc.y);
        doc.moveDown(0.5);
      });

      doc.moveDown();
      doc.moveTo(30, doc.y).lineTo(doc.page.width - 30, doc.y).stroke();
      doc.moveDown();
      doc.fontSize(8).text('Thank you for choosing NOGALSS Cooperative.', { align: 'center' });

      doc.end();
    });
  }

  async getFinancialPerformance() {
    // Basic aggregation for POC; in prod use a dedicated ledger summary table
    const deposits = await this.txnRepo.find({ where: { type: 'deposit', status: 'completed' } as any });
    const withdrawals = await this.txnRepo.find({ where: { type: 'withdrawal', status: 'completed' } as any });

    const revenue = deposits.reduce((sum, t) => sum + Number(t.amount), 0);
    const expenses = withdrawals.reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      revenue,
      expenses,
      netSurplus: revenue - expenses,
    };
  }

  async getDemographics() {
    const totalMembers = await this.memberRepo.count();
    const maleCount = await this.memberRepo.count({ where: { gender: 'MALE' } as any });
    const femaleCount = await this.memberRepo.count({ where: { gender: 'FEMALE' } as any });

    return {
      totalMembers,
      byGender: {
        MALE: maleCount,
        FEMALE: femaleCount,
      },
    };
  }
}
