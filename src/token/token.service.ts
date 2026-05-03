import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Token } from '../entities/token.entity';
import { MonnifyService } from '../monnify/monnify.service';
import { EmailService } from '../email/email.service';
import { SmsService as ChannelSmsService } from '../notification/channels/sms.service';
import * as crypto from 'crypto';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly TOKEN_PRICE = 5500; // NGN

  private isMonnifyMockModeEnabled(): boolean {
    const raw = String(process.env.MONNIFY_MOCK_MODE ?? '').toLowerCase();
    return raw === 'true' || (raw !== 'false' && process.env.NODE_ENV !== 'production');
  }

  constructor(
    @InjectRepository(Token)
    private readonly tokenRepo: Repository<Token>,
    private readonly monnifyService: MonnifyService,
    private readonly dataSource: DataSource,
    private readonly emailService: EmailService,
    private readonly smsService: ChannelSmsService,
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

    try {
      const session = await this.monnifyService.initializeTransaction({
        amount: this.TOKEN_PRICE,
        customerName: dto.name,
        customerEmail: dto.email,
        paymentReference,
        paymentDescription: 'Member Registration Token Purchase',
        redirectUrl: dto.redirectUrl,
      });

      return session;
    } catch (error: any) {
      if (!this.isMonnifyMockModeEnabled()) {
        throw error;
      }

      this.logger.warn(`Monnify init unavailable, using mock token checkout flow: ${error.message}`);
      return {
        status: 'success',
        checkoutUrl: dto.redirectUrl,
        transactionReference: paymentReference,
        paymentReference,
        mockMode: true,
      };
    }
  }

  async verifyAndGenerateToken(paymentReference: string, fallbackPhone?: string) {
    let payment: any;

    try {
      payment = await this.monnifyService.verifyTransaction(paymentReference);
    } catch (error: any) {
      if (!this.isMonnifyMockModeEnabled()) {
        throw error;
      }

      this.logger.warn(`Monnify verify unavailable, accepting mock payment for ${paymentReference}: ${error.message}`);
      payment = {
        paymentStatus: 'PAID',
        customerDTO: {},
        customer: {},
      };
    }

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
      payerPhone: payment.customerDTO?.phoneNumber || payment.customer?.phone || payment.customerPhone || fallbackPhone || '',
      isUsed: false,
    });

    const savedToken = await this.tokenRepo.save(token);

    // Send the token email securely
    try {
      this.logger.log(`📧 Queuing token email to ${savedToken.payerEmail}`);
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
      this.logger.log(`✅ Token email queued successfully for ${savedToken.payerEmail}`);
    } catch (error: any) {
      this.logger.error(`❌ Failed to queue token email for ${savedToken.payerEmail}: ${error.message}`, error.stack);
    }

    // Send SMS with token if phone provided (non-blocking)
    try {
      if (savedToken.payerPhone) {
        this.logger.log(`📱 Sending token SMS to ${savedToken.payerPhone} with token: ${savedToken.token.substring(0, 8)}...`);
        const smsSent = await this.smsService.sendSms(
          savedToken.payerPhone,
          `Your NOGALSS registration token is: ${savedToken.token}`
        );
        if (smsSent) {
          this.logger.log(`✅ Token SMS sent successfully to ${savedToken.payerPhone}`);
        } else {
          this.logger.warn(`⚠️ Token SMS marking as failed for ${savedToken.payerPhone}`);
        }
      } else {
        this.logger.warn(`⚠️ Phone number not provided, skipping SMS for token ${savedToken.token.substring(0, 8)}...`);
      }
    } catch (smsErr: any) {
      this.logger.error(`❌ Failed to send token SMS to ${savedToken.payerPhone}: ${smsErr.message}`, smsErr.stack);
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

  async updateTokenDraft(tokenCode: string, draftData: any, draftStep: number) {
    const token = await this.tokenRepo.findOne({ where: { token: tokenCode } });
    if (!token) {
      throw new NotFoundException('Invalid token code.');
    }
    await this.tokenRepo.update(token.id, {
      draftData,
      draftStep,
    });
    return { status: 'success' };
  }

  async resendTokenSms(tokenCode: string, phoneNumber?: string): Promise<{ status: string; message: string }> {
    const token = await this.tokenRepo.findOne({ where: { token: tokenCode } });
    if (!token) {
      throw new NotFoundException('Invalid token code.');
    }

    const phone = phoneNumber || token.payerPhone;
    if (!phone) {
      throw new BadRequestException('No phone number available for this token.');
    }

    try {
      this.logger.log(`📱 Resending token SMS to ${phone}`);
      const smsSent = await this.smsService.sendSms(
        phone,
        `Your NOGALSS registration token is: ${token.token}`
      );

      if (smsSent) {
        this.logger.log(`✅ Token SMS resent successfully to ${phone}`);
        return {
          status: 'success',
          message: `SMS resent successfully to ${phone}`,
        };
      } else {
        this.logger.warn(`⚠️ Token SMS resend failed for ${phone}`);
        return {
          status: 'failed',
          message: 'Failed to send SMS. Please try again.',
        };
      }
    } catch (error: any) {
      this.logger.error(`❌ Error resending token SMS: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to resend SMS: ${error.message}`);
    }
  }
}
