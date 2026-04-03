import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PaymentService } from './src/paystack/payment.service';
import { PaystackConfigService } from './src/paystack/paystack-config.service';

async function test() {
  console.log('--- Payment Service Test ---');
  const app = await NestFactory.createApplicationContext(AppModule);
  const paymentService = app.get(PaymentService);
  const configService = app.get(PaystackConfigService);

  const userId = 18; // yamojr004@gmail.com
  console.log(`Initialising payment for user ID: ${userId}...`);

  try {
    const res = await paymentService.initializeRegistrationPayment(userId);
    console.log('SUCCESS!');
    console.log('Response:', JSON.stringify(res, null, 2));
  } catch (err: any) {
    console.error('FAILED!');
    console.error('Error Message:', err.message);
    if (err.response) {
      console.error('Error Response:', JSON.stringify(err.response, null, 2));
    }
  }

  await app.close();
}

test();
