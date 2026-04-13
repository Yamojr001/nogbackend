import { Controller, Post, Get, Body, Query, Param } from '@nestjs/common';
import { TokenService } from './token.service';
import { Public } from '../auth/public.decorator';

@Controller('tokens')
export class TokenController {
  constructor(private readonly tokenService: TokenService) {}

  @Public()
  @Post('buy')
  async buyToken(@Body() dto: { name: string; email: string; phone: string; redirectUrl: string }) {
    return this.tokenService.initializeTokenPurchase(dto);
  }

  @Public()
  @Get('complete')
  async completePurchase(@Query('paymentReference') paymentReference: string) {
    return this.tokenService.verifyAndGenerateToken(paymentReference);
  }

  @Public()
  @Get('verify/:code')
  async verifyToken(@Param('code') code: string) {
    return this.tokenService.validateToken(code);
  }
}
