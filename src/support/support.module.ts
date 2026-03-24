import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportTicket } from '../entities/support-ticket.entity';
import { SupportService } from './support.service';
import { SupportController } from './support.controller';
import { NotificationModule } from '../notification/notification.module';
import { User } from '../entities/user.entity';
import { Member } from '../entities/member.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([SupportTicket, User, Member]),
    NotificationModule,
  ],
  providers: [SupportService],
  controllers: [SupportController],
  exports: [SupportService],
})
export class SupportModule {}
