import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Headers,
  RawBody,
  Req,
  Request,
  UseGuards,
  Inject,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ParallexPaymentService } from './parallex-payment.service';
import { Public } from '../auth/public.decorator';

@Controller('parallex')
export class ParallexPaymentController {
  private readonly logger = new Logger(ParallexPaymentController.name);
  
  constructor(private readonly parallexPaymentService: ParallexPaymentService) {
    this.logger.log('ParallexPaymentController initialized at /api/parallex');
  }

  /**
   * Initialize payment
   */
  @UseGuards(JwtAuthGuard)
  @Post('payments/initialize')
  async initializePayment(
    @Request() req: any,
    @Body() dto: { amount: number; description?: string; metadata?: any },
  ) {
    return this.parallexPaymentService.initializePayment(req.user.sub || req.user.id, dto.amount, {
      description: dto.description,
      ...dto.metadata,
    });
  }

  /**
   * Verify payment
   */
  @UseGuards(JwtAuthGuard)
  @Get('payments/verify/:reference')
  async verifyPayment(
    @Request() req: any,
    @Param('reference') reference: string,
  ) {
    return this.parallexPaymentService.verifyPayment(reference);
  }

  /**
   * Create virtual account
   */
  @UseGuards(JwtAuthGuard)
  @Post('virtual-accounts/create')
  async createVirtualAccount(@Request() req: any, @Body() dto: any) {
    return this.parallexPaymentService.createVirtualAccount(req.user.userId || req.user.sub || req.user.id, dto);
  }

  /**
   * Create virtual account for organisation
   */
  @UseGuards(JwtAuthGuard)
  @Post('virtual-accounts/organisation/:id')
  async createOrgVirtualAccount(@Param('id') id: number) {
    return this.parallexPaymentService.createOrganisationVirtualAccount(id);
  }

  /**
   * List supported banks for virtual accounts
   */
  @UseGuards(JwtAuthGuard)
  @Get('virtual-accounts/banks')
  async getBanks() {
    return this.parallexPaymentService.getBanks();
  }

  /**
   * Fetch merchant billing amount from third-party transfer service
   */
  @UseGuards(JwtAuthGuard)
  @Get('third-party-transfer/billing-amount')
  async fetchBillingAmount() {
    return this.parallexPaymentService.fetchUserBillingAmount();
  }

  /**
   * Name Enquiry (Validate Bank Account)
   */
  @UseGuards(JwtAuthGuard)
  @Post('transfers/name-enquiry')
  async nameEnquiry(@Body() dto: { accountNumber: string; bankCode: string }) {
    return this.parallexPaymentService.nameEnquiry(dto.accountNumber, dto.bankCode);
  }

  /**
   * Initiate Outbound Transfer
   */
  @UseGuards(JwtAuthGuard)
  @Post('transfers/initiate')
  async initiateTransfer(
    @Request() req: any,
    @Body() dto: { amount: number; accountNumber: string; bankCode: string; narration?: string; beneficiaryName?: string },
  ) {
    return this.parallexPaymentService.initiateTransfer(
      req.user.sub || req.user.id,
      dto.amount,
      dto.accountNumber,
      dto.bankCode,
      dto.narration,
      dto.beneficiaryName,
    );
  }

  /**
   * Webhook endpoint for Parallex payment notifications
   */
  @Public()
  @Post('webhook/payment')
  async handlePaymentWebhook(
    @Body() body: any,
    @Headers('x-parallex-signature') signature: string,
    @Req() req: Request,
  ) {
    this.logger.log(`[Parallex Webhook] Received payment webhook: ${JSON.stringify(body)}`);

    // Verify signature only when a webhook secret is configured.
    if (signature && process.env.PARALLEX_WEBHOOK_SECRET) {
      const bodyString = JSON.stringify(body);
      const isValid = this.parallexPaymentService.verifyWebhookSignature(bodyString, signature);
      if (!isValid) {
        this.logger.warn('[Parallex Webhook] Invalid signature');
        return { status: 'error', message: 'Invalid signature' };
      }
    } else if (signature && !process.env.PARALLEX_WEBHOOK_SECRET) {
      this.logger.warn('[Parallex Webhook] Signature header received but PARALLEX_WEBHOOK_SECRET is not configured; skipping verification');
    }

    // Process webhook
    const event = body.event || body.type;
    return this.parallexPaymentService.handleWebhook(event, body.data || body);
  }

  /**
   * Setup Webhook URL (Admin only)
   */
  @UseGuards(JwtAuthGuard)
  @Post('setup/webhook')
  async setupWebhook(@Body() dto: { callbackUrl: string }) {
    return this.parallexPaymentService.registerWebhook(dto.callbackUrl);
  }

  /**
   * Enable Outflow Processing (Admin only)
   */
  @UseGuards(JwtAuthGuard)
  @Post('setup/enable-outflow')
  async enableOutflow(@Body() dto: { transactionPassword?: string }) {
    const password = dto.transactionPassword || process.env.PARALLEX_TRANSACTION_PASSWORD;
    if (!password) {
      throw new BadRequestException('Transaction password is required');
    }
    return this.parallexPaymentService.enableOutflowProcessing(password);
  }
}
