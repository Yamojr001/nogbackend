import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationType } from '../entities/notification.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('send')
  async sendNotification(
    @Body() body: { userId: number; title: string, message: string; type: NotificationType },
  ) {
    return this.notificationService.trigger(body.userId, body.title, body.message, [body.type]);
  }

  @Get('me')
  async getMyNotifications(@Req() req: any) {
    return this.notificationService.getByUser(req.user.userId);
  }

  @Get('me/unread-count')
  async getUnreadCount(@Req() req: any) {
    return { count: await this.notificationService.getUnreadCount(req.user.userId) };
  }

  @Get('user/:userId')
  async getUserNotifications(@Param('userId', ParseIntPipe) userId: number) {
    return this.notificationService.getByUser(userId);
  }

  @Patch(':id/read')
  async markAsRead(@Param('id', ParseIntPipe) id: number) {
    return this.notificationService.markAsRead(id);
  }
}
