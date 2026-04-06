import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Member } from '../entities/member.entity';
import { User, UserRole } from '../entities/user.entity';

@Injectable()
export class RegistrationFeeGuard implements CanActivate {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authUser = request.user;

    if (!authUser) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Only block unpaid members. Other roles are not registration-fee gated.
    if (authUser.role !== UserRole.MEMBER) {
      return true;
    }

    const userId = Number(authUser.userId ?? authUser.sub ?? authUser.id);
    if (!userId) {
      throw new UnauthorizedException('Invalid authentication payload');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['memberProfile'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    let isPaid = Boolean(user.hasPaidRegistrationFee || user.memberProfile?.hasPaidRegistrationFee);

    if (!isPaid && !user.memberProfile) {
      const member = await this.memberRepository.findOne({ where: { userId } });
      isPaid = Boolean(member?.hasPaidRegistrationFee);
    }

    if (!isPaid) {
      throw new ForbiddenException('PAYMENT_REQUIRED');
    }

    return true;
  }
}
