import {
  Controller, Get, Post, Param, ParseIntPipe,
  UseGuards, Req, Query, Body, ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { VirtualAccountService } from './virtual-account.service';
import { PaystackConfigService } from './paystack-config.service';

@Controller('virtual-accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VirtualAccountController {
  constructor(
    private readonly vaService: VirtualAccountService,
    private readonly config: PaystackConfigService,
  ) {}

  /** Member: get their own virtual account */
  @Get('mine')
  async getMine(@Req() req: any) {
    const va = await this.vaService.findByUserId(req.user.id);
    return {
      hasAccount: !!va?.accountNumber,
      isReady: va?.status === 'active',
      accountNumber: va?.accountNumber ?? null,
      accountName: va?.accountName ?? null,
      bankName: va?.bankName ?? null,
      status: va?.status ?? 'not_provisioned',
      balance: va?.balance ?? 0,
      currency: va?.currency ?? 'NGN',
    };
  }

  /** Member: self-request provisioning */
  @Post('request')
  async requestAccount(@Req() req: any) {
    return this.vaService.provision(req.user.id);
  }

  /** Admin: list all virtual accounts */
  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN, UserRole.APEX_ADMIN)
  async listAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.vaService.findAll(+page, +limit);
  }

  /** Admin: provision for a specific user */
  @Post('provision/:userId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.APEX_ADMIN)
  async provision(@Param('userId', ParseIntPipe) userId: number) {
    return this.vaService.provision(userId);
  }

  /** Admin: activate a pending account (after keys are configured) */
  @Post('activate/:userId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.APEX_ADMIN)
  async activate(@Param('userId', ParseIntPipe) userId: number) {
    return this.vaService.activate(userId);
  }
}

/**
 * PaymentSettingsController
 * ─────────────────────────
 * Super Admin only — manage Paystack keys & settings from the admin panel.
 * No key is returned in GET response for security (only shows whether configured).
 */
@Controller('admin/payment-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class PaymentSettingsController {
  constructor(private readonly config: PaystackConfigService) {}

  @Get()
  async getSettings() {
    const key     = await this.config.getSecretKey();
    const bank    = await this.config.getPreferredBank();
    const enabled = await this.config.isEnabled();

    return {
      paystackEnabled: enabled,
      secretKeyConfigured: !!key,
      preferredBank: bank,
      availableBanks: ['access-bank', 'wema-bank', 'titan-bank'],
    };
  }

  @Post()
  async updateSettings(
    @Body() dto: {
      secretKey?: string;
      preferredBank?: string;
      enabled?: boolean;
    },
  ) {
    if (dto.secretKey !== undefined) {
      await this.config.set(
        'paystack.secret_key',
        dto.secretKey,
        'Paystack secret API key (sk_test_... or sk_live_...)',
      );
    }
    if (dto.preferredBank !== undefined) {
      await this.config.set('paystack.preferred_bank', dto.preferredBank, 'Preferred bank for virtual accounts');
    }
    if (dto.enabled !== undefined) {
      await this.config.set('paystack.enabled', String(dto.enabled), 'Toggle Paystack integration on/off');
    }

    return { success: true, message: 'Payment settings updated' };
  }
}
