import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Organisation } from '../src/entities/organisation.entity';
import { Repository } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const orgRepo = app.get<Repository<Organisation>>(getRepositoryToken(Organisation));
  
  console.log('Activating all organisations...');
  const result = await orgRepo.createQueryBuilder()
    .update(Organisation)
    .set({ status: 'active' })
    .execute();
  console.log(`Successfully updated ${result.affected} organisations.`);
  
  await app.close();
}

bootstrap().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
