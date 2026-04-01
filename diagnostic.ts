import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  
  console.log('Checking database connection...');
  try {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    
    console.log('--- Organisation Table ---');
    const orgTable = await queryRunner.getTable('organisation');
    if (orgTable) {
      console.log('Columns in organisation table:');
      orgTable.columns.forEach(col => console.log(` - ${col.name} (${col.type})`));
    } else {
      console.log('Table organisation NOT FOUND!');
    }
    
    console.log('\n--- User Tours Table ---');
    const tourTable = await queryRunner.getTable('user_tours');
    if (tourTable) {
      console.log('Table user_tours exists.');
    } else {
      console.log('Table user_tours NOT FOUND!');
    }
    
    await queryRunner.release();
  } catch (err) {
    console.error('Diagnostic failed:', err.message);
  } finally {
    await app.close();
  }
}

bootstrap();
