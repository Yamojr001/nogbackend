import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { Organisation } from '../src/entities/organisation.entity';
import { Branch } from '../src/entities/branch.entity';
import { Group } from '../src/entities/group.entity';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  const orgs = await dataSource.getRepository(Organisation).find({ select: ['name', 'code', 'type'] });
  const branches = await dataSource.getRepository(Branch).find({ select: ['name', 'code'] });
  const groups = await dataSource.getRepository(Group).find({ select: ['name', 'code'] });

  console.log('--- CODES ---');
  orgs.forEach(o => console.log(`[${o.type}] ${o.name}: ${o.code}`));
  branches.forEach(b => console.log(`[branch] ${b.name}: ${b.code}`));
  groups.forEach(g => console.log(`[group] ${g.name}: ${g.code}`));
  console.log('--- END ---');

  await app.close();
}
bootstrap();
