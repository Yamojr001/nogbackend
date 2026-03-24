import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contribution } from '../entities/contribution.entity';
import { ContributionService } from './contribution.service';
import { ContributionController } from './contribution.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Contribution])],
  providers: [ContributionService],
  controllers: [ContributionController],
  exports: [ContributionService],
})
export class ContributionModule {}
