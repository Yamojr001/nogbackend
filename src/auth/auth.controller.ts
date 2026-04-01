import { Controller, Request, Post, Get, UseGuards, Body, Param } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

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
}
