import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { Organisation } from '../src/entities/organisation.entity';
import { Branch } from '../src/entities/branch.entity';
import { Group } from '../src/entities/group.entity';
import { DataSource } from 'typeorm';
import { generateOrgCode } from '../src/utils/code-generator.util';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  console.log('--- Generating Initial Organisation Codes ---');

  // 1. Organisations
  const orgRepo = dataSource.getRepository(Organisation);
  const orgs = await orgRepo.find({ where: { code: null } });
  for (const org of orgs) {
    org.code = generateOrgCode();
    await orgRepo.save(org);
    console.log(`Org: ${org.name} -> ${org.code}`);
  }

  // 2. Branches
  const branchRepo = dataSource.getRepository(Branch);
  const branches = await branchRepo.find({ where: { code: null } });
  for (const branch of branches) {
    branch.code = generateOrgCode();
    await branchRepo.save(branch);
    console.log(`Branch: ${branch.name} -> ${branch.code}`);
  }

  // 3. Groups
  const groupRepo = dataSource.getRepository(Group);
  const groups = await groupRepo.find({ where: { code: null } });
  for (const group of groups) {
    group.code = generateOrgCode();
    await groupRepo.save(group);
    console.log(`Group: ${group.name} -> ${group.code}`);
  }

  console.log('--- Done ---');
  await app.close();
}

bootstrap();
