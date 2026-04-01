import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../entities/user.entity';
import { Member } from '../entities/member.entity';
import { Wallet } from '../entities/wallet.entity';
import { Organisation } from '../entities/organisation.entity';
import { Audit } from '../entities/audit.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { LocalStrategy } from './local.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { SecurityService } from './security.service';
import { NotificationModule } from '../notification/notification.module';
import { WalletModule } from '../wallet/wallet.module';
import { ApprovalModule } from '../approval/approval.module';
import { PaystackModule } from '../paystack/paystack.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User, Member, Wallet, Organisation, Audit]),
    PassportModule,
    NotificationModule,
    forwardRef(() => WalletModule),
    forwardRef(() => ApprovalModule),
    PaystackModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'secretKey',
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN') || '1h' },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy, LocalStrategy, JwtAuthGuard, RolesGuard, SecurityService],
  controllers: [AuthController],
  exports: [AuthService, JwtAuthGuard, RolesGuard, JwtModule, SecurityService],
})
export class AuthModule {}
