import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Approval, ApprovalStatus } from '../entities/approval.entity';
import { ApprovalLog } from '../entities/approval-log.entity';
import { ApprovalWorkflowConfig, WorkflowType } from '../entities/approval-workflow-config.entity';

@Injectable()
export class ApprovalService {
  constructor(
    @InjectRepository(Approval)
    private approvalRepository: Repository<Approval>,
    @InjectRepository(ApprovalLog)
    private logRepo: Repository<ApprovalLog>,
    @InjectRepository(ApprovalWorkflowConfig)
    private configRepo: Repository<ApprovalWorkflowConfig>,
  ) {}

  async create(data: Partial<Approval>): Promise<Approval> {
    const ap = this.approvalRepository.create(data);
    return this.approvalRepository.save(ap);
  }

  async findAll(): Promise<Approval[]> {
    return this.approvalRepository.find({ relations: ['initiator'] });
  }

  async findOne(id: number): Promise<Approval> {
    const approval = await this.approvalRepository.findOne({ 
      where: { id }, 
      relations: ['initiator'] 
    });
    if (!approval) throw new NotFoundException('Approval request not found');
    return approval;
  }

  async findLogs(requestId: number): Promise<ApprovalLog[]> {
    return this.logRepo.find({ 
      where: { requestId }, 
      relations: ['actor'],
      order: { timestamp: 'ASC' }
    });
  }

  async approve(id: number, actorId: number, notes?: string): Promise<Approval> {
    const approval = await this.findOne(id);
    
    if (approval.status !== ApprovalStatus.PENDING && approval.status !== ApprovalStatus.APPROVED) {
      throw new BadRequestException('Approval is no longer active');
    }

    const isFinalStep = approval.currentLevel >= approval.totalLevels;
    
    // Update status
    approval.status = isFinalStep ? ApprovalStatus.EXECUTED : ApprovalStatus.APPROVED;
    if (!isFinalStep) {
      approval.currentLevel += 1;
    } else {
      approval.approvedAt = new Date();
    }

    const saved = await this.approvalRepository.save(approval);

    // Record Log
    await this.logRepo.save(this.logRepo.create({
      requestId: id,
      actorId,
      action: isFinalStep ? 'final_approval' : 'partial_approval',
      notes,
    }));

    return saved;
  }

  async reject(id: number, actorId: number, notes?: string): Promise<Approval> {
    const approval = await this.findOne(id);
    if (approval.status !== ApprovalStatus.PENDING && approval.status !== ApprovalStatus.APPROVED) {
      throw new BadRequestException('Can only reject active requests');
    }

    approval.status = ApprovalStatus.REJECTED;
    const saved = await this.approvalRepository.save(approval);

    // Record Log
    await this.logRepo.save(this.logRepo.create({
      requestId: id,
      actorId,
      action: 'rejected',
      notes,
    }));

    return saved;
  }
}
