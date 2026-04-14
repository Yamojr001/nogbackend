import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Token } from '../entities/token.entity';
import { MonnifyService } from '../monnify/monnify.service';
import { EmailService } from '../email/email.service';
import * as crypto from 'crypto';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly TOKEN_PRICE = 5500; // NGN

  constructor(
    @InjectRepository(Token)
    private readonly tokenRepo: Repository<Token>,
    private readonly monnifyService: MonnifyService,
    private readonly dataSource: DataSource,
    private readonly emailService: EmailService,
  ) {}

  generateTokenCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 40; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async initializeTokenPurchase(dto: { name: string; email: string; phone: string; redirectUrl: string }) {
    const paymentReference = `TKN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    const session = await this.monnifyService.initializeTransaction({
      amount: this.TOKEN_PRICE,
      customerName: dto.name,
      customerEmail: dto.email,
      paymentReference,
      paymentDescription: 'Member Registration Token Purchase',
      redirectUrl: dto.redirectUrl,
    });

    return session;
  }

  async verifyAndGenerateToken(paymentReference: string) {
    const payment = await this.monnifyService.verifyTransaction(paymentReference);
    
    if (payment.paymentStatus !== 'PAID') {
       throw new BadRequestException('Payment has not been completed.');
    }

    // Check if token already exists for this reference
    let existing = await this.tokenRepo.findOne({ where: { paymentReference } });
    if (existing) return existing;

    // Generate new token
    const tokenStr = this.generateTokenCode();
    const token = this.tokenRepo.create({
      token: tokenStr,
      paymentReference,
      payerName: payment.customerDTO?.name || payment.customer?.name || payment.customerName || 'N/A',
      payerEmail: payment.customerDTO?.email || payment.customer?.email || payment.customerEmail || 'N/A',
      payerPhone: payment.customerDTO?.phoneNumber || payment.customer?.phone || payment.customerPhone || '',
      isUsed: false,
    });

    const savedToken = await this.tokenRepo.save(token);

    // Send the token email securely
    try {
      await this.emailService.queueEmail(
        savedToken.payerEmail,
        'token_purchase', 
        'Your NOGALSS Registration Token',
        'token_purchase',
        {
          name: savedToken.payerName,
          token: savedToken.token,
        }
      );
    } catch (error: any) {
      this.logger.error(`Failed to queue token email for ${savedToken.payerEmail}: ${error.message}`);
    }

    return savedToken;
  }

  async validateToken(tokenCode: string) {
    const token = await this.tokenRepo.findOne({ where: { token: tokenCode } });
    if (!token) {
      throw new NotFoundException('Invalid token code.');
    }
    if (token.isUsed) {
      throw new BadRequestException('This token has already been used.');
    }
    return token;
  }

  async markTokenAsUsed(tokenCode: string, userId: number) {
    const token = await this.validateToken(tokenCode);
    await this.tokenRepo.update(token.id, {
      isUsed: true,
      usedByUserId: userId,
      usedAt: new Date(),
    });
  }
}
