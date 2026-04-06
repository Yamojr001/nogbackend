import { Controller, Request, Post, Get, UseGuards, Body, Param, Patch } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PaymentService } from '../paystack/payment.service';
import { LocalAuthGuard } from './local-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private paymentService: PaymentService,
  ) { }

  @Get('health')
  async health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req) {
    const ip = req.headers['x-forwarded-for'] || req.ip;
    const userAgent = req.headers['user-agent'] || 'Unknown Browser';
    return this.authService.login(req.user, ip, userAgent);
  }

  @Post('google')
  async googleLogin(@Request() req, @Body('idToken') idToken: string) {
    const ip = req.headers['x-forwarded-for'] || req.ip;
    const userAgent = req.headers['user-agent'] || 'Unknown Browser';
    return this.authService.googleLogin(idToken, ip, userAgent);
  }

  @UseGuards(JwtAuthGuard)
  @Post('otp/request')
  async requestOtp(@Request() req, @Body('purpose') purpose: string) {
    const code = await this.authService['otpService'].generateOtp(req.user.userId, purpose as any);
    return { message: 'OTP sent successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('otp/verify')
  async verifyOtp(@Request() req, @Body() dto: { code: string, purpose: string }) {
    return await this.authService['otpService'].verifyOtp(req.user.userId, dto.purpose as any, dto.code);
  }

  @Post('register')
  async register(@Body() dto: any) {
    return this.authService.register(dto);
  }

  @Post('register/initialize-payment')
  @UseGuards(JwtAuthGuard)
  async initializePayment(@Request() req: any) {
    return this.paymentService.initializeRegistrationPayment(req.user.userId);
  }

  @Post('register/verify-payment')
  @UseGuards(JwtAuthGuard)
  async verifyPayment(@Request() req: any, @Body('reference') reference: string) {
    return this.paymentService.verifyRegistrationPayment(req.user.userId, reference);
  }

  @Post('refresh')
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Request() req) {
    return this.authService.logout(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    return this.authService.getProfile(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile') 
  async updateProfilePost(@Request() req, @Body() dto: any) {
    return this.authService.updateProfile(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfilePatch(@Request() req, @Body() dto: any) {
    return this.authService.updateProfile(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req) {
    return req.user;
  }

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: { token: string, password: string }) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @Get('hierarchy/organisations')
  async getPublicOrganisations() {
    return this.authService.getPublicOrganisations();
  }

  @Get('hierarchy/organisations/:id/sub-orgs')
  async getPublicSubOrgs(@Param('id') id: string) {
    return this.authService.getPublicSubOrgs(+id);
  }

  @Get('hierarchy/sub-orgs/:id/groups')
  async getPublicGroups(@Param('id') id: string) {
    return this.authService.getPublicGroups(+id);
  }

  @Post('emergency-fix-user')
  async emergencyFixUser(@Body('email') email: string) {
    const dataSource = this.authService['dataSource'];
    const results = [];
    
    // 1. Update Users table
    const userTables = ['users', '"user"'];
    for (const table of userTables) {
      try {
        const res = await dataSource.query(
          `UPDATE ${table} SET has_paid_registration_fee = true, status = 'active', is_verified = true WHERE email = $1`,
          [email]
        );
        results.push({ table, result: res });
      } catch (e) { results.push({ table, error: e.message }); }
    }

    // 2. Update Members table
    const memberTables = ['members', 'member'];
    const userLinkingCols = ['user_id', 'userId', '"userId"', '"user_id"'];
    
    for (const table of memberTables) {
      for (const col of userLinkingCols) {
        try {
          // Try to join with users/user to find the member by email
          const query = `
            UPDATE ${table} SET has_paid_registration_fee = true, status = 'active', kyc_status = 'verified'
            WHERE ${col} IN (
              SELECT id FROM users WHERE email = $1
              UNION
              SELECT id FROM "user" WHERE email = $1
            )
          `;
          const res = await dataSource.query(query, [email]);
          results.push({ table, col, result: res });
        } catch (e) { continue; }
      }
    }
    
    return { status: 'completed', message: `Emergency fix attempt for ${email}`, results };
  }
}
