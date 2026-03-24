import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserTour } from '../entities/user-tour.entity';
import { UserTourService } from './user-tour.service';
import { UserTourController } from './user-tour.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserTour])],
  controllers: [UserTourController],
  providers: [UserTourService],
  exports: [UserTourService],
})
export class UserTourModule {}
