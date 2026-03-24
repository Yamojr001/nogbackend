import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartnerController } from './partner.controller';
import { PartnerService } from './partner.service';
import { Organisation } from '../entities/organisation.entity';
import { Branch } from '../entities/branch.entity';
import { Member } from '../entities/member.entity';
import { Transaction } from '../entities/transaction.entity';
import { Approval } from '../entities/approval.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organisation, Branch, Member, Transaction, Approval
    ])
  ],
  controllers: [PartnerController],
  providers: [PartnerService],
  exports: [PartnerService]
})
export class PartnerModule {}
