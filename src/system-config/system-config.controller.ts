import { Controller, Get, Put, Body, Param, Post, UseGuards } from '@nestjs/common';
import { SystemConfigService } from './system-config.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('admin/config')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SystemConfigController {
  constructor(private readonly configService: SystemConfigService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  findAll() {
    return this.configService.findAll();
  }

  @Get(':key')
  @Roles(UserRole.SUPER_ADMIN)
  findOne(@Param('key') key: string) {
    return this.configService.findOne(key);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  create(@Body() data: any) {
    return this.configService.create(data);
  }

  @Put('update')
  @Roles(UserRole.SUPER_ADMIN)
  update(@Body('key') key: string, @Body('value') value: string) {
    return this.configService.update(key, value);
  }
}
