import {
  Controller, Post, Req, Headers, HttpCode,
  Logger, BadRequestException, RawBodyRequest,
} from '@nestjs/common';
import { Request } from 'express';
import { VirtualAccountService } from './virtual-account.service';

/**
 * PaystackWebhookController
 * ─────────────────────────
 * Public endpoint — NO JWT guard (Paystack cannot authenticate).
 * Security is provided by HMAC signature verification.
 *
 * Paystack sends events to: POST /webhooks/paystack
 */
@Controller('webhooks')
export class PaystackWebhookController {
  private readonly logger = new Logger(PaystackWebhookController.name);

  constructor(private readonly vaService: VirtualAccountService) {}

  @Post('paystack')
  @HttpCode(200)
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-paystack-signature') signature: string,
  ) {
    const rawBody = req.rawBody;

    if (!rawBody) {
      throw new BadRequestException('Missing raw body — ensure rawBody is enabled on this route');
    }

    // Verify HMAC signature
    const isValid = await this.vaService.verifyWebhookSignature(rawBody, signature ?? '');

    if (!isValid) {
      this.logger.warn('Invalid Paystack webhook signature — request rejected');
      // Return 200 to prevent Paystack retrying (but do nothing)
      return { received: false, reason: 'invalid_signature' };
    }

    let body: any;
    try {
      body = JSON.parse(rawBody.toString());
    } catch {
      throw new BadRequestException('Invalid JSON payload');
    }

    const event: string = body?.event ?? '';
    const data: any     = body?.data ?? {};

    this.logger.log(`Received Paystack webhook: ${event}`);

    // Process asynchronously — respond 200 immediately to Paystack
    this.vaService.handleWebhookEvent(event, data).catch((err) => {
      this.logger.error(`Webhook processing error for "${event}": ${err.message}`);
    });

    return { received: true };
  }
}
