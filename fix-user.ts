import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const email = 'yamojr004@gmail.com';

  console.log(`Fixing user: ${email}`);

  const userTables = ['users', '"user"', 'member', 'members'];
  
  for (const table of userTables) {
    try {
      const result = await dataSource.query(`UPDATE ${table} SET has_paid_registration_fee = true, status = 'active' WHERE email = $1 OR user_id IN (SELECT id FROM users WHERE email = $1) OR user_id IN (SELECT id FROM "user" WHERE email = $1)`, [email]);
      console.log(`Updated table ${table}:`, result);
    } catch (e) {
      console.error(`Failed to update table ${table}: ${e.message}`);
    }
  }

  await app.close();
}

bootstrap();
