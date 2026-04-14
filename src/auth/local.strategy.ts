import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from './auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'identifier' });
  }

  async validate(username: string, password: string): Promise<any> {
    let user: any = null;
    try {
      user = await this.authService.validateUser(username, password);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      // Do not leak backend internals to clients during authentication.
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
