import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Token } from '../entities/token.entity';
import { TokenService } from './token.service';
import { TokenController } from './token.controller';
import { MonnifyModule } from '../monnify/monnify.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Token]),
    MonnifyModule,
  ],
  providers: [TokenService],
  controllers: [TokenController],
  exports: [TokenService],
})
export class TokenModule {}
