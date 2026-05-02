import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Organisation } from '../entities/organisation.entity';
import { User } from '../entities/user.entity';
import { OrganisationService } from './organisation.service';
import { OrganisationController } from './organisation.controller';
import { ParallexModule } from '../parallex/parallex.module';

@Module({
  imports: [TypeOrmModule.forFeature([Organisation, User]), ParallexModule],
  providers: [
    OrganisationService,
    {
      provide: 'ORGANISATION_TREE_REPO',
      useFactory: (dataSource: DataSource) => dataSource.getTreeRepository(Organisation),
      inject: [DataSource],
    },
  ],
  controllers: [OrganisationController],
  exports: [OrganisationService],
})
export class OrganisationModule {}
