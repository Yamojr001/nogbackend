import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserTour } from '../entities/user-tour.entity';

@Injectable()
export class UserTourService {
  constructor(
    @InjectRepository(UserTour)
    private tourRepo: Repository<UserTour>,
  ) {}

  async getStatus(userId: number, tourType: string = 'onboarding') {
    let tour = await this.tourRepo.findOne({ where: { userId, tourType } });
    if (!tour) {
      // If it doesn't exist, we assume it's a new user/tour and create a record
      tour = this.tourRepo.create({ userId, tourType, isCompleted: false, lastStep: 0 });
      await this.tourRepo.save(tour);
    }
    return tour;
  }

  async completeTour(userId: number, tourType: string = 'onboarding') {
    const tour = await this.getStatus(userId, tourType);
    tour.isCompleted = true;
    tour.lastStep = 0; // Reset or keep at last? Plan says complete=true logic
    return this.tourRepo.save(tour);
  }

  async resetTour(userId: number, tourType: string = 'onboarding') {
    const tour = await this.getStatus(userId, tourType);
    tour.isCompleted = false;
    tour.lastStep = 0;
    return this.tourRepo.save(tour);
  }

  async updateStep(userId: number, step: number, tourType: string = 'onboarding') {
    const tour = await this.getStatus(userId, tourType);
    tour.lastStep = step;
    return this.tourRepo.save(tour);
  }
}
