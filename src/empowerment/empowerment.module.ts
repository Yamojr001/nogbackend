import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmpowermentProgram } from '../entities/empowerment-program.entity';
import { ProgramApplication } from '../entities/program-application.entity';
import { EmpowermentService } from './empowerment.service';
import { EmpowermentController } from './empowerment.controller';
import { ApprovalModule } from '../approval/approval.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmpowermentProgram, ProgramApplication]),
    ApprovalModule,
  ],
  providers: [EmpowermentService],
  controllers: [EmpowermentController],
  exports: [EmpowermentService],
})
export class EmpowermentModule {}
