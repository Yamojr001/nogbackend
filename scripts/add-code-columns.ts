import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  console.log('--- Adding "code" columns to branches and groups ---');

  try {
    // Add code column to branches
    await dataSource.query(`ALTER TABLE branches ADD COLUMN IF NOT EXISTS code VARCHAR(255) UNIQUE;`);
    console.log('Added code column to branches table');

    // Add code column to groups
    await dataSource.query(`ALTER TABLE groups ADD COLUMN IF NOT EXISTS code VARCHAR(255) UNIQUE;`);
    console.log('Added code column to groups table');

  } catch (error) {
    console.error('Error adding columns:', error.message);
  }

  console.log('--- Done ---');
  await app.close();
}

bootstrap();
