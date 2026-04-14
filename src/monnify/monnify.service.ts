import { Injectable, Logger } from '@nestjs/common';
import { MonnifyConfigService } from './monnify-config.service';

@Injectable()
export class MonnifyService {
  private readonly logger = new Logger(MonnifyService.name);

  constructor(private readonly monnifyConfig: MonnifyConfigService) {}

  async initializeTransaction(payload: {
    amount: number;
    customerName: string;
    customerEmail: string;
    paymentReference: string;
    paymentDescription: string;
    redirectUrl: string;
  }) {
    const contractCode = await this.monnifyConfig.getContractCode();
    
    const body = {
      amount: payload.amount,
      customerName: payload.customerName,
      customerEmail: payload.customerEmail,
      paymentReference: payload.paymentReference,
      paymentDescription: payload.paymentDescription,
      currencyCode: 'NGN',
      contractCode: contractCode,
      redirectUrl: payload.redirectUrl,
      paymentMethods: ['CARD', 'ACCOUNT_TRANSFER'],
    };

    const res = await this.monnifyConfig.request('POST', '/api/v1/merchant/transactions/init-transaction', body);
    
    if (res.requestSuccessful) {
      return {
        status: 'success',
        checkoutUrl: res.responseBody.checkoutUrl,
        transactionReference: res.responseBody.transactionReference,
      };
    } else {
      throw new Error(`Monnify Initialization Failed: ${res.responseMessage}`);
    }
  }

  async verifyTransaction(reference: string) {
    // If it starts with MNFY (or includes '|'), it's a Monnify transaction reference
    const isTransactionRef = reference.startsWith('MNFY') || reference.includes('|');
    const queryParam = isTransactionRef ? 'transactionReference' : 'paymentReference';
    
    const res = await this.monnifyConfig.request('GET', `/api/v1/merchant/transactions/query?${queryParam}=${encodeURIComponent(reference)}`);
    
    if (res.requestSuccessful) {
      return res.responseBody;
    } else {
      throw new Error(`Monnify Verification Failed: ${res.responseMessage}`);
    }
  }
}
