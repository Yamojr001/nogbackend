import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ParallexBvnService } from './parallex-bvn.service';

@Controller('parallex-bvn')
export class ParallexBvnController {
  private readonly logger = new Logger(ParallexBvnController.name);

  constructor(private readonly parallexBvnService: ParallexBvnService) {
    this.logger.log('ParallexBvnController initialized at /api/parallex-bvn');
  }

  /**
   * Verify BVN
   */
  @UseGuards(JwtAuthGuard)
  @Post('bvn/verify')
  async verifyBvn(
    @Request() req: any,
    @Body() dto: { bvn: string },
  ) {
    this.logger.log(`[BVN] Verification initiated for user ${req.user.sub || req.user.id}`);
    return this.parallexBvnService.verifyBvn(req.user.sub || req.user.id, dto.bvn);
  }

  /**
   * Get BVN verification status
   */
  @UseGuards(JwtAuthGuard)
  @Get('bvn/status')
  async getVerificationStatus(@Request() req: any) {
    return this.parallexBvnService.getVerificationStatus(req.user.sub || req.user.id);
  }
}
