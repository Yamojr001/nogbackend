import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmpowermentProgram } from '../entities/empowerment-program.entity';
import { ProgramApplication, ApplicationStatus } from '../entities/program-application.entity';
import { ApprovalEngineService } from '../approval/approval-engine.service';

@Injectable()
export class EmpowermentService {
  constructor(
    @InjectRepository(EmpowermentProgram)
    private programRepo: Repository<EmpowermentProgram>,
    @InjectRepository(ProgramApplication)
    private applicationRepo: Repository<ProgramApplication>,
    private approvalEngine: ApprovalEngineService,
  ) {}

  async findAllPrograms() {
    return this.programRepo.find({ where: { } });
  }

  async findProgramById(id: number) {
    const program = await this.programRepo.findOne({ where: { id } });
    if (!program) throw new NotFoundException('Program not found');
    return program;
  }

  async createProgram(data: Partial<EmpowermentProgram>) {
    const program = this.programRepo.create(data);
    return this.programRepo.save(program);
  }

  async applyForProgram(userId: number, userType: string, programId: number, documents: any) {
    const program = await this.findProgramById(programId);
    
    const application = this.applicationRepo.create({
      applicantId: userId,
      applicantType: userType,
      programId,
      documentsSubmitted: documents,
      status: ApplicationStatus.PENDING,
    });

    const saved = await this.applicationRepo.save(application);

    // Trigger Approval Flow
    await this.approvalEngine.process('program_application', saved.id, userId);

    return saved;
  }

  async getMyApplications(userId: number) {
    return this.applicationRepo.find({ 
      where: { applicantId: userId }, 
      relations: ['program'] 
    });
  }
}
