import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemConfig } from '../entities/system-config.entity';
import { MonnifyConfigService } from './monnify-config.service';
import { MonnifyService } from './monnify.service';

@Module({
  imports: [TypeOrmModule.forFeature([SystemConfig])],
  providers: [MonnifyConfigService, MonnifyService],
  exports: [MonnifyConfigService, MonnifyService],
})
export class MonnifyModule {}
