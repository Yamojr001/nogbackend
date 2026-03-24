import { Controller, Get, Post, Body, UseGuards, Request, Query } from '@nestjs/common';
import { UserTourService } from './user-tour.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('user-tours')
@UseGuards(JwtAuthGuard)
export class UserTourController {
  constructor(private readonly tourService: UserTourService) {}

  @Get('status')
  getStatus(@Request() req, @Query('type') type: string) {
    return this.tourService.getStatus(req.user.userId, type || 'onboarding');
  }

  @Post('complete')
  completeTour(@Request() req, @Body('type') type: string) {
    return this.tourService.completeTour(req.user.userId, type || 'onboarding');
  }

  @Post('reset')
  resetTour(@Request() req, @Body('type') type: string) {
    return this.tourService.resetTour(req.user.userId, type || 'onboarding');
  }

  @Post('step')
  updateStep(@Request() req, @Body('step') step: number, @Body('type') type: string) {
    return this.tourService.updateStep(req.user.userId, step, type || 'onboarding');
  }
}
