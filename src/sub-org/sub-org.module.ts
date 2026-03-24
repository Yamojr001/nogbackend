import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubOrgController } from './sub-org.controller';
import { SubOrgService } from './sub-org.service';
import { User } from '../entities/user.entity';
import { Branch } from '../entities/branch.entity';
import { Member } from '../entities/member.entity';
import { Transaction } from '../entities/transaction.entity';
import { Product } from '../entities/product.entity';
import { Approval } from '../entities/approval.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Branch, Member, Transaction, Product, Approval])
  ],
  controllers: [SubOrgController],
  providers: [SubOrgService],
  exports: [SubOrgService]
})
export class SubOrgModule {}
