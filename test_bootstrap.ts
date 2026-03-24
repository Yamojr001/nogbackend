import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';

async function test() {
  try {
    const app = await NestFactory.create(AppModule, { logger: false });
    console.log('SUCCESS');
    process.exit(0);
  } catch (err) {
    console.error('BOOTSTRAP_ERROR:', err.message);
    process.exit(1);
  }
}
test();
