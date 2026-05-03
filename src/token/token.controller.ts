import { Controller, Post, Get, Body, Query, Param, Patch, Logger } from '@nestjs/common';
import { TokenService } from './token.service';
import { Public } from '../auth/public.decorator';

@Controller('tokens')
export class TokenController {
  private readonly logger = new Logger(TokenController.name);

  constructor(private readonly tokenService: TokenService) {}

  @Public()
  @Post('buy')
  async buyToken(@Body() dto: { name: string; email: string; phone: string; redirectUrl: string }) {
    return this.tokenService.initializeTokenPurchase(dto);
  }

  @Public()
  @Get('complete')
  async completePurchase(
    @Query('paymentReference') paymentReference: string,
    @Query('phone') phone?: string,
  ) {
    this.logger.log(`📦 Token completion requested for reference: ${paymentReference}`);
    this.logger.log(`📱 Phone parameter received: ${phone || 'NOT PROVIDED'}`);
    return this.tokenService.verifyAndGenerateToken(paymentReference, phone);
  }

  @Public()
  @Get('verify/:code')
  async verifyToken(@Param('code') code: string) {
    return this.tokenService.validateToken(code);
  }

  @Public()
  @Patch(':code/draft')
  async updateDraft(
    @Param('code') code: string,
    @Body() dto: { draftData: any; draftStep: number },
  ) {
    return this.tokenService.updateTokenDraft(code, dto.draftData, dto.draftStep);
  }

  @Public()
  @Post('resend-sms/:code')
  async resendTokenSms(
    @Param('code') code: string,
    @Body() dto?: { phone?: string },
  ) {
    this.logger.log(`📱 Resend SMS requested for token: ${code.substring(0, 8)}...`);
    return this.tokenService.resendTokenSms(code, dto?.phone);
  }
}
