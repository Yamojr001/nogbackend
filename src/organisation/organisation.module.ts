import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Organisation } from '../entities/organisation.entity';
import { OrganisationService } from './organisation.service';
import { OrganisationController } from './organisation.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Organisation])],
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
