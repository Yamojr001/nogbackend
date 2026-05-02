import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { BvnVerification, BvnVerificationStatus } from '../entities/bvn-verification.entity';
import { ParallexConfigService } from './parallex-config.service';

/**
 * Parallex BVN Verification Service
 * Handles BVN (Bank Verification Number) verification via Parallex API
 */
@Injectable()
export class ParallexBvnService {
  private readonly logger = new Logger(ParallexBvnService.name);

  constructor(
    private readonly parallexConfig: ParallexConfigService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(BvnVerification)
    private readonly bvnVerificationRepo: Repository<BvnVerification>,
  ) {}

  /**
   * Verify BVN using Parallex API
   * @param userId User ID
   * @param bvn Bank Verification Number (11 digits)
   * @returns Verification result
   */
  async verifyBvn(userId: number, bvn: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!bvn || bvn.length !== 11 || !/^\d+$/.test(bvn)) {
      throw new BadRequestException('BVN must be 11 digits');
    }

    const enabled = await this.parallexConfig.isEnabled();
    if (!enabled) {
      throw new BadRequestException('Parallex BVN verification is currently disabled');
    }

    try {
      this.logger.log(`[Parallex BVN] Verifying BVN for user ${userId}`);

      // Call Parallex BVN verification endpoint
      // Adjust endpoint path based on actual Parallex API documentation
      const endpoint = process.env.PARALLEX_BVN_ENDPOINT || '/api/v1/verification/bvn';
      const response = await this.parallexConfig.request(
        'POST',
        endpoint,
        {
          bvn,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
            // dateOfBirth removed as it's not in User entity
        },
      );

      const data = response.data as any;

      // Parse response (adjust based on Parallex response structure)
      const isVerified = data.status === 'success' || data.verified === true;
      const bvnVerification = this.bvnVerificationRepo.create({
        userId,
        bvn,
          verificationStatus: isVerified ? BvnVerificationStatus.VERIFIED : BvnVerificationStatus.FAILED,
        parallexResponse: data,
        verifiedAt: isVerified ? new Date() : null,
        firstName: data.firstName || user.firstName,
        lastName: data.lastName || user.lastName,
      });

      await this.bvnVerificationRepo.save(bvnVerification);

      // Update user if verified
      if (isVerified) {
        await this.userRepo.update(userId, {
          bvn,
          isVerified: true,
        });
        this.logger.log(`[Parallex BVN] BVN verified for user ${userId}`);
      }

      return {
        status: isVerified ? 'success' : 'failed',
        message: isVerified
          ? 'BVN verification successful'
          : 'BVN verification failed',
        verified: isVerified,
        data: isVerified ? data : null,
      };
    } catch (err) {
      this.logger.error(`[Parallex BVN] Verification failed: ${err.message}`);

      // Record failed attempt
      const bvnVerification = this.bvnVerificationRepo.create({
        userId,
        bvn,
          verificationStatus: BvnVerificationStatus.FAILED,
        parallexResponse: { error: err.message },
      });
      await this.bvnVerificationRepo.save(bvnVerification);

      throw new BadRequestException(`BVN verification failed: ${err.message}`);
    }
  }

  /**
   * Get BVN verification status for a user
   */
  async getVerificationStatus(userId: number) {
    const verification = await this.bvnVerificationRepo.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return {
        verified: verification?.verificationStatus === BvnVerificationStatus.VERIFIED,
      status: verification?.verificationStatus || 'not_verified',
      verifiedAt: verification?.verifiedAt || null,
    };
  }
}
