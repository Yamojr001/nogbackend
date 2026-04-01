import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BanksController } from './banks.controller';
import { BanksService } from './banks.service';
import { Bank } from '../entities/bank.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Bank])],
  controllers: [BanksController],
  providers: [BanksService],
  exports: [BanksService],
})
export class BanksModule {}
