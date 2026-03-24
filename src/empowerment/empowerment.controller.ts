import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { EmpowermentService } from './empowerment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('empowerment')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmpowermentController {
  constructor(private readonly empowermentService: EmpowermentService) {}

  @Get('programs')
  findAllPrograms() {
    return this.empowermentService.findAllPrograms();
  }

  @Get('programs/:id')
  findProgram(@Param('id') id: string) {
    return this.empowermentService.findProgramById(+id);
  }

  @Post('programs')
  @Roles(UserRole.SUPER_ADMIN, UserRole.APEX_ADMIN)
  createProgram(@Body() data: any, @Req() req: any) {
    data.createdBy = req.user.userId;
    return this.empowermentService.createProgram(data);
  }

  @Post('apply/:programId')
  apply(
    @Param('programId') programId: string,
    @Req() req: any,
    @Body('documents') documents: any,
  ) {
    return this.empowermentService.applyForProgram(
      req.user.userId,
      req.user.role === UserRole.MEMBER ? 'member' : 'organisation',
      +programId,
      documents,
    );
  }

  @Get('my-applications')
  getMyApplications(@Req() req: any) {
    return this.empowermentService.getMyApplications(req.user.userId);
  }
}
