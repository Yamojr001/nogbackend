import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { DataSource, QueryFailedError } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import { Member } from '../entities/member.entity';
import { Wallet, WalletType } from '../entities/wallet.entity';
import { Organisation } from '../entities/organisation.entity';
import { Group } from '../entities/group.entity';
import { Audit } from '../entities/audit.entity';
import { RegisterUserDto } from './dto/register.dto';
import { EmailService } from '../email/email.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../entities/notification.entity';
import { OtpService } from '../notification/otp.service';
import { SecurityService } from './security.service';
import { OtpPurpose } from '../entities/otp-code.entity';
import { EncryptionService } from '../common/encryption.service';
import { ApprovalEngineService } from '../approval/approval-engine.service';
import { NextOfKin } from '../entities/next-of-kin.entity';
import { BankAccount, OwnerType } from '../entities/bank-account.entity';

@Injectable()
export class AuthService {
  private normalizeBcryptHash(hash: string | null | undefined): string {
    if (!hash) return '';
    if (hash.startsWith('$2y$')) {
      return `$2b$${hash.slice(4)}`;
    }
    return hash;
  }

  private isMissingColumnError(error: unknown): boolean {
    const message = ((error as any)?.message || '').toLowerCase();
    const code = (error as any)?.code;
    return (
      error instanceof QueryFailedError ||
      code === '42703' ||
      code === '42P01' ||
      (message.includes('column') && message.includes('does not exist')) ||
      (message.includes('relation') && message.includes('does not exist'))
    );
  }

  private async findUserForLogin(email: string): Promise<any | null> {
    try {
      return await this.userRepository.findOne({ where: { email }, relations: ['organisation'] });
    } catch (error) {
      // Fallback for environments with older DB schema missing optional auth columns.
      if (!this.isMissingColumnError(error)) {
        throw error;
      }

      let rows: any[] = [];
      try {
        rows = await this.dataSource.query(
          `SELECT id, email, password, role
           FROM "user"
           WHERE email = $1
           LIMIT 1`,
          [email],
        );
      } catch (innerError) {
        if (!this.isMissingColumnError(innerError)) {
          throw innerError;
        }

        rows = await this.dataSource.query(
          `SELECT id, email, password, role
           FROM users
           WHERE email = $1
           LIMIT 1`,
          [email],
        );
      }

      if (!rows.length) return null;
      const row = rows[0];

      return {
        id: row.id,
        email: row.email,
        password: row.password,
        role: row.role,
        organisationId: null,
        organisation: undefined,
        failedLoginAttempts: 0,
        needsCaptcha: false,
        lockUntil: null,
        refreshTokenHash: null,
      };
    }
  }

  private async safeUserUpdate(userId: number, payload: Partial<User>) {
    try {
      await this.userRepository.update(userId, payload);
    } catch (error) {
      if (!this.isMissingColumnError(error)) {
        throw error;
      }
      // Ignore updates that target columns not present in older schemas.
    }
  }

  private async insertWalletCompat(
    queryRunner: any,
    walletData: {
      type: WalletType;
      balance: number;
      currency: string;
      status: string;
      ownerId: number;
      ownerType: WalletType;
    },
  ): Promise<number> {
    const columnRows = await queryRunner.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_name = 'wallets'`,
    );

    const availableColumns = new Set(columnRows.map((row: any) => row.column_name));
    const insertColumns: string[] = [];
    const insertValues: any[] = [];

    const candidates: Array<[string, any]> = [
      ['type', walletData.type],
      ['balance', walletData.balance],
      ['currency', walletData.currency],
      ['status', walletData.status],
      ['owner_id', walletData.ownerId],
      ['owner_type', walletData.ownerType],
    ];

    for (const [column, value] of candidates) {
      if (availableColumns.has(column)) {
        insertColumns.push(column);
        insertValues.push(value);
      }
    }

    if (!insertColumns.length) {
      throw new Error('No compatible wallet columns found');
    }

    const placeholders = insertColumns.map((_, index) => `$${index + 1}`).join(', ');
    const sql = `INSERT INTO wallets (${insertColumns.join(', ')}) VALUES (${placeholders}) RETURNING id`;
    const rows = await queryRunner.query(sql, insertValues);
    return rows[0]?.id;
  }

  private validatePasswordStrength(password: string): boolean {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasNonalphas = /\W/.test(password);
    return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasNonalphas;
  }

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Audit)
    private auditRepository: Repository<Audit>,
    private jwtService: JwtService,
    private dataSource: DataSource,
    private emailService: EmailService,
    private notificationService: NotificationService,
    private otpService: OtpService,
    private securityService: SecurityService,
    private encryptionService: EncryptionService,
    private approvalEngine: ApprovalEngineService,
  ) {}

  private googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  async googleLogin(idToken: string, ip?: string, userAgent?: string) {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new UnauthorizedException('Invalid Google token');
      }

      const { email, sub: googleId, given_name, family_name, name } = payload;

      let user = await this.userRepository.findOne({ 
        where: [{ email }, { googleId }],
        relations: ['organisation'] 
      });

      if (!user) {
        // Create new user if not found
        user = this.userRepository.create({
          email,
          googleId,
          firstName: given_name || '',
          lastName: family_name || '',
          name: name || `${given_name} ${family_name}`.trim(),
          password: await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10), // Random password
          role: UserRole.MEMBER,
          status: 'active', // Google users are pre-verified
          isVerified: true,
        });
        user = await this.userRepository.save(user);

        // Audit: record registration event
        await this.auditRepository.save(
          this.auditRepository.create({
            userId: user.id,
            action: 'USER_REGISTER_GOOGLE',
            entityType: 'User',
            entityId: String(user.id),
            ipAddress: ip || 'unknown',
            details: `User registered via Google: ${email}`,
          }),
        );
      } else if (!user.googleId) {
        // Link existing account if not already linked
        await this.userRepository.update(user.id, { googleId });
        user.googleId = googleId;
      }

      return this.login(user, ip, userAgent);
    } catch (error) {
      console.error('Google Auth Error:', error.message);
      throw new UnauthorizedException('Google authentication failed');
    }
  }

  async forgotPassword(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) return { message: 'If that email exists, a reset link has been sent.' };

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

    await this.userRepository.update(user.id, { resetToken, resetTokenExpires });

    await this.notificationService.trigger(
      user.id,
      'Password Reset Request - Coop-OS',
      `A password reset was requested. If you did not make this request, please secure your account. Reset link: https://nogalss.org/reset-password?token=${resetToken}`,
      [NotificationType.EMAIL]
    );

    return { message: 'If that email exists, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: BigInt | string) {
    if (!this.validatePasswordStrength(newPassword.toString())) {
      throw new UnauthorizedException('Password is too weak. Must be 8+ chars with uppercase, lowercase, number, and special character.');
    }
    const user = await this.userRepository.findOne({
      where: { resetToken: token },
    });

    if (!user || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(newPassword.toString(), 10);
    await this.userRepository.update(user.id, {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpires: null,
    });

    return { message: 'Password reset successfully' };
  }


  async register(dto: RegisterUserDto) {
    const { email, password, firstName, lastName, phone, role } = dto;
    let { organisationId, organisationCode } = dto;

    const normalizedRole = (() => {
      if (!role) return UserRole.MEMBER;
      const candidate = String(role).toLowerCase();
      return (Object.values(UserRole) as string[]).includes(candidate)
        ? (candidate as UserRole)
        : null;
    })();

    if (!normalizedRole) {
      throw new UnauthorizedException('Invalid role provided');
    }

    // 1. Resolve Organisation if code provided
    let org: Organisation | null = null;
    if (organisationCode) {
      try {
        org = await this.dataSource.getRepository(Organisation).findOne({
          where: { code: organisationCode },
          // Select only columns needed for registration to support older DB schemas.
          select: ['id', 'code', 'name'] as (keyof Organisation)[],
        });
      } catch (error) {
        if (!this.isMissingColumnError(error)) {
          throw error;
        }

        const rows = await this.dataSource.query(
          `SELECT id, code, name
           FROM organizations
           WHERE code = $1
           LIMIT 1`,
          [organisationCode],
        );

        org = rows.length ? ({ id: rows[0].id, code: rows[0].code, name: rows[0].name } as Organisation) : null;
      }

      if (!org) throw new UnauthorizedException('Invalid organisation code');
      organisationId = org.id;
    }

    if (!organisationId && role !== UserRole.SUPER_ADMIN) {
      throw new UnauthorizedException('Organisation selection required');
    }

    // 2. Check if user exists
    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) {
      throw new UnauthorizedException('Email already registered');
    }

    // Phase 7: Block temporary email domains
    const disposableDomains = ['mailinator.com', 'guerrillamail.com', 'tempmail.com', '10minutemail.com'];
    const emailDomain = email.split('@')[1];
    if (disposableDomains.includes(emailDomain)) {
       throw new UnauthorizedException('Temporary email domains are not allowed. Please use a permanent email.');
    }

    if (!this.validatePasswordStrength(password)) {
      throw new UnauthorizedException('Password is too weak. Must be 8+ chars with uppercase, lowercase, number, and special character.');
    }

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 4. Create User
      const user = queryRunner.manager.create(User, {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        phone,
        role: normalizedRole,
        organisation: { id: organisationId } as Organisation,
        status: 'pending', // Explicitly pending
        nin: dto.nin,
        bvn: dto.bvn,
      });
      const savedUser = await queryRunner.manager.save(user);

      // 5. Create Wallet
      const savedWalletId = await this.insertWalletCompat(queryRunner, {
        type: WalletType.MEMBER,
        balance: 0,
        currency: 'NGN',
        status: 'active',
        ownerId: savedUser.id,
        ownerType: WalletType.MEMBER,
      });

      // 6. Create Bank Account
      if (dto.accountNumber) {
        const bankAcc = queryRunner.manager.create(BankAccount, {
          ownerId: savedUser.id,
          ownerType: OwnerType.MEMBER,
          accountName: dto.accountName,
          accountNumber: dto.accountNumber,
          bankName: dto.bankName,
          bvn: dto.bvn,
        });
        await queryRunner.manager.save(bankAcc);
      }

      // 7. Create Member Profile
      const member = queryRunner.manager.create(Member, {
        user: savedUser,
        userId: savedUser.id,
        walletId: savedWalletId,
        organisationId: organisationId,
        subOrgId: dto.subOrgId,
        groupId: dto.groupId,
        branchId: dto.branchId,
        registrationOfficerId: dto.registrationOfficerId,
        gender: dto.gender,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        maritalStatus: dto.maritalStatus,
        stateOfOrigin: dto.stateOfOrigin,
        nationality: dto.nationality,
        address: dto.address,
        occupation: dto.occupation,
        educationalQualification: dto.educationalQualification,
        extOrgName: dto.extOrgName,
        extPosition: dto.extPosition,
        extStateChapter: dto.extStateChapter,
        savingsFrequency: dto.savingsFrequency,
        proposedSavingsAmount: dto.proposedSavingsAmount,
        empowermentInterest: dto.empowermentInterest,
        kycStatus: 'pending',
        status: 'pending',
      } as any);
      const savedMember = await queryRunner.manager.save(member);

      // 8. Create Next of Kin
      if (dto.nokName) {
        const nok = queryRunner.manager.create(NextOfKin, {
          memberId: savedMember.id,
          name: dto.nokName,
          relationship: dto.nokRelationship,
          phone: dto.nokPhone,
          address: dto.nokAddress,
        });
        await queryRunner.manager.save(nok);
      }

      await queryRunner.commitTransaction();

      // Initiate Approval Workflow
      if (savedUser.role === UserRole.MEMBER) {
        await this.approvalEngine.process('member_registration', savedMember.id, savedUser.id);
      }

      // â”€â”€â”€ Trigger Emails â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      try {
        // 1. Welcome / Confirmation
        await this.notificationService.trigger(
          savedUser.id,
          'Welcome to Coop-OS',
          `Welcome ${savedUser.firstName}! Your registration for NOGALSS Cooperative is ${savedUser.status}.`,
          [NotificationType.EMAIL, NotificationType.IN_APP]
        );

        // 2. Verification Email (In a real app, generate a token first)
        const verificationToken = 'dummy-token-' + Math.random().toString(36).substr(2, 9);
        await this.notificationService.trigger(
          savedUser.id,
          'Verify Your Email - Coop-OS',
          `Please verify your email to fully activate your account. link: https://nogalss.org/verify-email?token=${verificationToken}`,
          [NotificationType.EMAIL]
        );
      } catch (emailErr) {
        console.error('Failed to queue registration emails:', emailErr.message);
      }

      return this.login(savedUser);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.findUserForLogin(email);
    if (!user) return null;

    console.log(`[Auth] Login attempt for ${email} - user found: ${!!user}`);

    // Phase 5: Brute-force protection
    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
      throw new UnauthorizedException(`Account is locked. Try again in ${remainingMinutes} minutes.`);
    }

    const normalizedHash = this.normalizeBcryptHash(user.password);
    const isMatch = await bcrypt.compare(password, normalizedHash);

    if (isMatch) {
      console.log(`[Auth] User ${email} successfully logged in`);
      // Success: Reset failure count and captcha
      if (user.failedLoginAttempts > 0 || user.lockUntil || user.needsCaptcha) {
        await this.safeUserUpdate(user.id, { failedLoginAttempts: 0, lockUntil: null, needsCaptcha: false });
      }
      const { password: _, refreshTokenHash: __, ...result } = user;
      return result;
    } else {
      // Failure: Increment count, set captcha if 3+, lock if 5+
      const failedAttempts = user.failedLoginAttempts + 1;
      let lockUntil = null;
      let needsCaptcha = user.needsCaptcha;

      if (failedAttempts >= 3) {
        needsCaptcha = true;
      }
      
      if (failedAttempts >= 5) {
        lockUntil = new Date(Date.now() + 10 * 60000); // 10 minutes
      }
      await this.safeUserUpdate(user.id, { failedLoginAttempts: failedAttempts, lockUntil, needsCaptcha });
      
      if (needsCaptcha) {
        throw new UnauthorizedException({ message: 'Invalid credentials', needsCaptcha: true });
      }
      return null;
    }
  }

  async login(user: any, ipAddress?: string, userAgent?: string) {
    try {
      const payload = {
        email: user.email,
        sub: user.id,
        role: user.role,
        organisationId: user.organisation?.id ?? user.organisationId ?? null,
      };

      // Security: detect new login device/IP
      try {
        await this.securityService.detectNewLogin(user.id, ipAddress || 'unknown', userAgent || 'Unknown Browser');
      } catch (err) { 
        console.error('[Auth] Security service error (non-blocking):', err.message);
      }

      // Audit: record login event
      try {
        await this.auditRepository.save(
          this.auditRepository.create({
            userId: user.id,
            action: 'USER_LOGIN',
            entityType: 'User',
            entityId: String(user.id),
            ipAddress: ipAddress || 'unknown',
            details: `User ${user.email} logged in`,
            metadata: { email: user.email, role: user.role, userAgent: userAgent || 'Unknown Browser' },
          }),
        );
      } catch (err) {
        console.error('[Auth] Audit save error (non-blocking):', err.message);
      }

      // Generate tokens
      let accessToken: string;
      let refreshToken: string;
      
      try {
        accessToken = this.jwtService.sign(payload);
      } catch (err) {
        console.error('[Auth] JWT sign failed:', err.message, 'Payload:', payload);
        throw new Error(`Failed to generate access token: ${err.message}`);
      }

      try {
        refreshToken = await this.generateRefreshToken(user);
      } catch (err) {
        console.error('[Auth] Refresh token generation failed:', err.message);
        throw new Error(`Failed to generate refresh token: ${err.message}`);
      }

      return {
        access_token: accessToken,
        refresh_token: refreshToken,
      };
    } catch (error) {
      console.error('[Auth] Login failed:', error.message, error);
      throw error;
    }
  }

  async generateRefreshToken(user: any): Promise<string> {
    const payload = { sub: user.id };
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d', secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret' });
    try {
      const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
      await this.safeUserUpdate(user.id, { refreshTokenHash });
    } catch (error) {
      // Non-blocking: login should still succeed even if legacy schema cannot persist token hash.
      console.error('[Auth] Refresh token hash persistence skipped:', (error as any)?.message);
    }
    return refreshToken;
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, { secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret' });
      const user = await this.userRepository.findOne({ where: { id: payload.sub }, relations: ['organisation'] });
      
      if (!user || !user.refreshTokenHash) throw new UnauthorizedException();
      
      const isMatch = await bcrypt.compare(refreshToken, user.refreshTokenHash);
      if (!isMatch) throw new UnauthorizedException();

      return this.login(user);
    } catch (error) {
      throw new UnauthorizedException();
    }
  }

  async logout(userId: number): Promise<{ message: string }> {
    await this.userRepository.update(userId, { refreshTokenHash: null });
    return { message: 'Logged out successfully' };
  }

  async getPublicOrganisations() {
    return this.dataSource.getRepository(Organisation).find({
      select: ['id', 'name', 'code', 'type'],
      where: { type: 'partner' as any, status: 'active' as any }
    });
  }

  async getPublicSubOrgs(parentId: number) {
    return this.dataSource.getRepository(Organisation).find({
      select: ['id', 'name', 'code', 'type'],
      where: { parent: { id: parentId } as any, type: 'sub_org' as any, status: 'active' as any }
    });
  }

  async getPublicGroups(subOrgId: number) {
    return this.dataSource.getRepository(Group).find({
      select: ['id', 'name'],
      where: { organisation: { id: subOrgId } as any, status: 'active' as any }
    });
  }
}
