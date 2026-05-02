import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankAccount } from '../entities/bank-account.entity';
import { User } from '../entities/user.entity';
import { BankAccountService } from './bank-account.service';
import { BankAccountController } from './bank-account.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BankAccount, User])],
  providers: [BankAccountService],
  controllers: [BankAccountController],
  exports: [BankAccountService],
})
export class BankAccountModule {}
