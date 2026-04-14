import { Injectable, UnauthorizedException, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
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
import { Organisation, OrganisationType } from '../entities/organisation.entity';
import { Group } from '../entities/group.entity';
import { Branch } from '../entities/branch.entity';
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
import { PaymentService } from '../paystack/payment.service';
import { TokenService } from '../token/token.service';

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
      return await this.userRepository.findOne({ 
        where: { email }, 
        relations: ['organisation', 'memberProfile'] 
      });
    } catch (error) {
      if (!this.isMissingColumnError(error)) {
        throw error;
      }

      // Dynamic fallback for environments with older/inconsistent DB schemas.
      // We check what columns actually exist to avoid 500 errors.
      const tablesToTry = ['users', '"user"']; 
      let rows: any[] = [];

      for (const table of tablesToTry) {
        try {
          const tableNameForQuery = table.replace(/"/g, '');
          const columnRows = await this.dataSource.query(
            `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
            [tableNameForQuery]
          );
          const availableCols = new Set(columnRows.map((c: any) => c.column_name));

          const selectFields = ['id', 'email', 'password', 'role'];
          if (availableCols.has('first_name')) selectFields.push('first_name');
          if (availableCols.has('last_name')) selectFields.push('last_name');
          if (availableCols.has('name')) selectFields.push('name');
          if (availableCols.has('phone')) selectFields.push('phone');
          if (availableCols.has('status')) selectFields.push('status');
          if (availableCols.has('is_verified')) selectFields.push('is_verified');
          if (availableCols.has('has_paid_registration_fee')) selectFields.push('has_paid_registration_fee');
          if (availableCols.has('organization_id')) selectFields.push('organization_id');
          if (availableCols.has('branch_id')) selectFields.push('branch_id');

          rows = await this.dataSource.query(
            `SELECT ${selectFields.join(', ')} FROM ${table} WHERE email = $1 LIMIT 1`,
            [email]
          );
          if (rows.length > 0) break;
        } catch (e) {
          continue; 
        }
      }

      if (!rows.length) return null;
      const row = rows[0];

      return {
        id: row.id,
        email: row.email,
        password: row.password,
        role: row.role,
        firstName: row.first_name || '',
        lastName: row.last_name || '',
        name: row.name || `${row.first_name || ''} ${row.last_name || ''}`.trim(),
        phone: row.phone,
        status: row.status || 'active',
        isVerified: row.is_verified ?? true,
        hasPaidRegistrationFee: Boolean(row.has_paid_registration_fee ?? false),
        organisationId: row.organization_id || null,
        branchId: row.branch_id || null,
        organisation: undefined,
        memberProfile: undefined,
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

  private async insertMemberCompat(
    queryRunner: any,
    memberData: any,
  ): Promise<number> {
    const columnRows = await queryRunner.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_name = 'members'`,
    );

    const availableColumns = new Set(columnRows.map((row: any) => row.column_name));
    const insertColumns: string[] = [];
    const insertValues: any[] = [];

    const candidates: Array<[string, any]> = [
      ['membership_number', memberData.membershipNumber],
      ['membership_id', memberData.membershipNumber],
      ['user_id', memberData.userId],
      ['wallet_id', memberData.walletId],
      ['organization_id', memberData.organisationId],
      ['sub_org_id', memberData.subOrgId],
      ['group_id', memberData.groupId],
      ['branch_id', memberData.branchId],
      ['registration_officer_id', memberData.registrationOfficerId],
      ['gender', memberData.gender],
      ['date_of_birth', memberData.dateOfBirth],
      ['marital_status', memberData.maritalStatus],
      ['state_of_origin', memberData.stateOfOrigin],
      ['nationality', memberData.nationality],
      ['address', memberData.address],
      ['occupation', memberData.occupation],
      ['educational_qualification', memberData.educationalQualification],
      ['ext_org_name', memberData.extOrgName],
      ['ext_position', memberData.extPosition],
      ['ext_state_chapter', memberData.extStateChapter],
      ['savings_frequency', memberData.savingsFrequency],
      ['proposed_savings_amount', memberData.proposedSavingsAmount],
      ['empowerment_interest', memberData.empowermentInterest],
      ['kyc_status', memberData.kycStatus || 'pending'],
      ['status', memberData.status || 'pending'],
    ];

    for (const [column, value] of candidates) {
      if (availableColumns.has(column) && value !== undefined) {
        insertColumns.push(column);
        insertValues.push(value);
      }
    }

    if (!insertColumns.includes('user_id')) {
      throw new Error('user_id column required in members table');
    }

    const placeholders = insertColumns.map((_, index) => `$${index + 1}`).join(', ');
    const sql = `INSERT INTO members (${insertColumns.join(', ')}) VALUES (${placeholders}) RETURNING id`;
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
    private readonly notificationService: NotificationService,
    private readonly otpService: OtpService,
    private readonly securityService: SecurityService,
    private readonly approvalEngine: ApprovalEngineService,
    private readonly tokenService: TokenService,
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
        relations: ['organisation', 'memberProfile'] 
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
    const { email, password, firstName, lastName, phone, role, token } = dto;
    let { organisationId, organisationCode } = dto;

    if (role === UserRole.MEMBER && !token) {
       throw new BadRequestException('Registration token is required for members.');
    }

    if (token) {
       await this.tokenService.validateToken(token);
    }

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

    // 1. Resolve Organisation/Branch/Group if code provided
    if (organisationCode) {
      const resolved = await this.resolveOrgCode(organisationCode);
      if (!resolved) {
        throw new UnauthorizedException('Invalid organization/group code');
      }
      organisationId = resolved.organisationId;
      dto.branchId = resolved.branchId || dto.branchId;
      dto.groupId = resolved.groupId || dto.groupId;
      dto.subOrgId = resolved.subOrgId || dto.subOrgId;
    } else if (!organisationId) {
      // Default to Apex if no code/ID provided
      const apex = await this.dataSource.getRepository(Organisation).findOne({
        where: { type: OrganisationType.APEX },
        select: ['id']
      });
      if (apex) {
        organisationId = apex.id;
      }
    }

    if (!organisationId && role !== UserRole.SUPER_ADMIN) {
      throw new UnauthorizedException('Organisation selection required');
    }

    // 2. Check if user exists
    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) {
      throw new UnauthorizedException('Email already registered');
    }

    // Block temporary email domains
    const disposableDomains = ['mailinator.com', 'guerrillamail.com', 'tempmail.com', '10minutemail.com'];
    const emailDomain = email.split('@')[1];
    if (disposableDomains.includes(emailDomain)) {
       throw new UnauthorizedException('Temporary email domains are not allowed. Please use a permanent email.');
    }

    if (!this.validatePasswordStrength(password)) {
      throw new UnauthorizedException('Password is too weak. Must be 8+ chars with uppercase, lowercase, number, and special character.');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let savedUser: User;
    let savedMemberId: number;

    try {
      // 4. Create User
      const fullName = dto.name || `${firstName} ${lastName}`.trim();
      const fName = firstName || fullName.split(' ')[0] || '';
      const lName = lastName || fullName.split(' ').slice(1).join(' ') || '';

      const user = queryRunner.manager.create(User, {
        email,
        password: hashedPassword,
        firstName: fName,
        lastName: lName,
        name: fullName,
        phone: phone || null,
        role: normalizedRole,
        organisation: { id: organisationId } as Organisation,
        status: token ? 'active' : 'pending',
        isVerified: token ? true : false,
        hasPaidRegistrationFee: token ? true : false,
        nin: dto.nin || null,
        bvn: dto.bvn || null,
      });
      savedUser = await queryRunner.manager.save(user);

      // 5. Create Wallet
      const savedWalletId = await this.insertWalletCompat(queryRunner, {
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
      const membershipNumber = `NOG-${new Date().getFullYear()}-${savedUser.id}-${Math.floor(Math.random() * 9000) + 1000}`;
      savedMemberId = await this.insertMemberCompat(queryRunner, {
        membershipNumber,
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
        kycStatus: token ? 'verified' : 'pending',
        status: token ? 'approved' : 'pending',
        hasPaidRegistrationFee: token ? true : false,
      });

      // 8. Create Next of Kin
      if (dto.nokName) {
        const nok = queryRunner.manager.create(NextOfKin, {
          memberId: savedMemberId,
          name: dto.nokName,
          relationship: dto.nokRelationship,
          phone: dto.nokPhone,
          address: dto.nokAddress,
        });
        await queryRunner.manager.save(nok);
      }

      // 9. Mark Token as used
      if (token) {
        await this.tokenService.markTokenAsUsed(token, savedUser.id);
      }

      await queryRunner.commitTransaction();
    } catch (err) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw err;
    } finally {
      await queryRunner.release();
    }

    // --- Post-Transaction Logic ---
    try {
      // Initiate Approval Workflow
      if (savedUser.role === UserRole.MEMBER) {
        await this.approvalEngine.process('member_registration', savedMemberId, savedUser.id);
      }

      // Trigger Emails
      await this.notificationService.trigger(
        savedUser.id,
        'Welcome to Coop-OS',
        `Welcome ${savedUser.firstName}! Your registration for NOGALSS Cooperative is ${savedUser.status}.`,
        [NotificationType.EMAIL, NotificationType.IN_APP]
      ).catch(e => console.error('[Auth] Welcome email failed:', e.message));

      const verificationToken = 'dummy-token-' + Math.random().toString(36).substr(2, 9);
      await this.notificationService.trigger(
        savedUser.id,
        'Verify Your Email - Coop-OS',
        `Please verify your email to fully activate your account. link: https://nogalss.org/verify-email?token=${verificationToken}`,
        [NotificationType.EMAIL]
      ).catch(e => console.error('[Auth] Verification email failed:', e.message));
    } catch (postErr) {
      console.error('[Auth] Registration post-processing error:', postErr.message);
    }

    // 9. Return success or login tokens
    if (normalizedRole === UserRole.MEMBER) {
      return {
        status: 'success',
        needsPayment: false,
        message: 'Registration successful. You can now login.',
      };
    }

    const tokens = await this.login(savedUser);
    return {
      status: 'success',
      needsPayment: false,
      data: tokens,
      message: 'Registration successful.',
    };
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
      let memberProfile = user.memberProfile;
      if (!memberProfile && [UserRole.MEMBER, UserRole.GROUP_ADMIN, UserRole.GROUP_TREASURER, UserRole.GROUP_SECRETARY, UserRole.SUB_ORG_ADMIN].includes(user.role)) {
        memberProfile = await this.dataSource.getRepository(Member).findOne({ 
          where: { userId: user.id },
        });
      }
      
      const hasPaidRegistrationFee = user.role === UserRole.MEMBER ? (user.hasPaidRegistrationFee || (memberProfile?.hasPaidRegistrationFee ?? false)) : true;
      const isProfileComplete = user.role === UserRole.MEMBER ? !!(user.firstName && user.lastName && user.phone) : true;
      const branchId = user.branchId ?? memberProfile?.branchId ?? null;
      const groupId = memberProfile?.groupId ?? null;

      console.log(`[Auth] User ${user.id} (${user.role}) Login - Branch: ${branchId}, Group: ${groupId}`);

      const payload = {
        email: user.email,
        sub: user.id,
        role: user.role,
        organisationId: user.organisation?.id ?? user.organisationId ?? memberProfile?.organisationId ?? null,
        branchId,
        groupId,
        hasPaidRegistrationFee,
        isProfileComplete,
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
        role: user.role,
        user_name: user.name ?? `${user.firstName} ${user.lastName}`,
        hasPaidRegistrationFee,
        isProfileComplete,
        message: hasPaidRegistrationFee ? 'SUCCESS' : 'PAYMENT_REQUIRED',
        organisationId: payload.organisationId,
      };
    } catch (error) {
      console.error('[Auth] Login failed:', error.message, error);
      throw error;
    }
  }

  async generateRefreshToken(user: any): Promise<string> {
    const payload = { sub: user.id };
    const secret = process.env.JWT_REFRESH_SECRET || 'nogalss-super-refresh-secret-jwt-key-2026';
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d', secret });
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
      const secret = process.env.JWT_REFRESH_SECRET || 'nogalss-super-refresh-secret-jwt-key-2026';
      const payload = this.jwtService.verify(refreshToken, { secret });
      const user = await this.userRepository.findOne({ where: { id: payload.sub }, relations: ['organisation'] });
      
      if (!user) {
        console.warn(`[Auth] Refresh failed: User ${payload.sub} not found`);
        throw new UnauthorizedException();
      }
      if (!user.refreshTokenHash) {
        console.warn(`[Auth] Refresh failed: User ${user.email} has no stored refresh token hash`);
        throw new UnauthorizedException();
      }
      
      const isMatch = await bcrypt.compare(refreshToken, user.refreshTokenHash);
      if (!isMatch) {
        console.warn(`[Auth] Refresh failed: Token mismatch for user ${user.email}`);
        throw new UnauthorizedException();
      }

      return this.login(user);
    } catch (error) {
      console.error(`[Auth] Refresh error: ${error.message}`);
      throw new UnauthorizedException();
    }
  }

  async logout(userId: number): Promise<{ message: string }> {
    await this.userRepository.update(userId, { refreshTokenHash: null });
    return { message: 'Logged out successfully' };
  }

  async getProfile(userId: number) {
    let user;
    try {
      user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['organisation', 'memberProfile']
      });
    } catch (error) {
      if (!this.isMissingColumnError(error)) {
        throw error;
      }

      // Fast fallback for profile retrieval
      const rows = await this.dataSource.query(
        `SELECT id, email, role, name, status, is_verified, has_paid_registration_fee 
         FROM users WHERE id = $1 LIMIT 1`,
        [userId]
      ).catch(() => this.dataSource.query(
        `SELECT id, email, role, name, status, is_verified FROM "user" WHERE id = $1 LIMIT 1`,
        [userId]
      ));

      if (rows && rows.length > 0) {
        const row = rows[0];
        user = {
          id: row.id,
          email: row.email,
          role: row.role,
          name: row.name,
          status: row.status,
          isVerified: row.is_verified,
          has_paid_registration_fee: Boolean(row.has_paid_registration_fee ?? false),
          organisationId: row.organization_id || null,
          branchId: row.branch_id || null,
        } as any;
      }
    }

    if (!user) throw new UnauthorizedException('User not found');

    // Return sanitized profile
    const { password, refreshTokenHash, resetToken, resetTokenExpires, ...profile } = user;
    
    // Ensure memberProfile is also checked if it was missing from relations
    if (!profile.memberProfile && [UserRole.MEMBER].includes(profile.role)) {
       try {
         profile.memberProfile = await this.dataSource.getRepository(Member).findOne({ 
           where: { userId: profile.id } 
         });
         if (profile.memberProfile) {
           profile.hasPaidRegistrationFee = profile.hasPaidRegistrationFee || profile.memberProfile.hasPaidRegistrationFee;
         }
       } catch (e) { /* ignore member fetch error in fallback */ }
    }

    return profile;
  }

  async updateProfile(userId: number, dto: any) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['memberProfile', 'memberProfile.nextOfKin'],
    });
    if (!user) throw new NotFoundException('User not found');

    const { 
      name, firstName, lastName, phone, phoneNumber, 
      organisationCode,
      address, gender, dateOfBirth, maritalStatus, stateOfOrigin, nationality,
      occupation, educationalQualification,
      extOrgName, extPosition, extStateChapter,
      savingsFrequency, proposedSavingsAmount, empowermentInterest,
      nokName, nokRelationship, nokPhone, nokAddress, nokEmail
    } = dto;

    // Handle Organisation Code Resolution if provided
    if (organisationCode !== undefined) {
      if (organisationCode) {
        const resolved = await this.resolveOrgCode(organisationCode);
        user.organisationId = resolved.organisationId;
        user.branchId = resolved.branchId;
        // Update user-level fields
        await this.userRepository.save(user);

        // Update member-level fields if exists
        if (user.memberProfile) {
          user.memberProfile.organisationId = resolved.organisationId;
          user.memberProfile.branchId = resolved.branchId;
          user.memberProfile.groupId = resolved.groupId;
          await this.dataSource.getRepository(Member).save(user.memberProfile);
        }
      } else {
        // Default to Apex if code is explicitly cleared
        const orgRepo = this.dataSource.getRepository(Organisation);
        const apex = await orgRepo.findOne({ where: { type: 'apex' as any } });
        user.organisationId = apex?.id || null;
        user.branchId = null;
        await this.userRepository.save(user);

        if (user.memberProfile) {
          user.memberProfile.organisationId = apex?.id || null;
          user.memberProfile.branchId = null;
          user.memberProfile.groupId = null;
          await this.dataSource.getRepository(Member).save(user.memberProfile);
        }
      }
    }

    // Update User level fields
    if (name) user.name = name;
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone || phoneNumber) user.phone = phone || phoneNumber;

    await this.userRepository.save(user);

    // Update Member Profile level fields (if member)
    if (user.memberProfile) {
      const member = user.memberProfile;
      if (address !== undefined) member.address = address;
      if (gender !== undefined) member.gender = gender;
      if (dateOfBirth !== undefined) member.dateOfBirth = dateOfBirth;
      if (maritalStatus !== undefined) member.maritalStatus = maritalStatus;
      if (stateOfOrigin !== undefined) member.stateOfOrigin = stateOfOrigin;
      if (nationality !== undefined) member.nationality = nationality;
      if (occupation !== undefined) member.occupation = occupation;
      if (educationalQualification !== undefined) member.educationalQualification = educationalQualification;
      if (extOrgName !== undefined) member.extOrgName = extOrgName;
      if (extPosition !== undefined) member.extPosition = extPosition;
      if (extStateChapter !== undefined) member.extStateChapter = extStateChapter;
      if (savingsFrequency !== undefined) member.savingsFrequency = savingsFrequency;
      if (proposedSavingsAmount !== undefined) member.proposedSavingsAmount = proposedSavingsAmount;
      if (empowermentInterest !== undefined) member.empowermentInterest = empowermentInterest;

      await this.dataSource.getRepository(Member).save(member);

      // Handle Next of Kin
      if (nokName || nokRelationship || nokPhone || nokAddress || nokEmail) {
        let nok = member.nextOfKin;
        const nokRepo = this.dataSource.getRepository(NextOfKin);
        
        if (!nok) {
          nok = nokRepo.create({ memberId: member.id });
        }
        
        if (nokName) nok.name = nokName;
        if (nokRelationship) nok.relationship = nokRelationship;
        if (nokPhone) nok.phone = nokPhone;
        if (nokAddress) nok.address = nokAddress;
        if (nokEmail) nok.email = nokEmail;
        
        await nokRepo.save(nok);
      }
    }

    return this.getProfile(userId);
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
  /**
   * Resolves a unique code into its organizational hierarchy.
   * Checks Groups, then Branches, then Organisations.
   */
  async resolveOrgCode(code: string) {
    // 1. Check Groups
    const foundGroup = await this.dataSource.getRepository(Group).findOne({
      where: { code },
      relations: ['organisation', 'branch'],
    });
    if (foundGroup) {
      return {
        organisationId: foundGroup.organisationId,
        branchId: foundGroup.branchId,
        groupId: foundGroup.id,
        subOrgId: foundGroup.organisation?.type === 'sub_org' ? foundGroup.organisationId : null,
      };
    }

    // 2. Check Branches
    const foundBranch = await this.dataSource.getRepository(Branch).findOne({
      where: { code },
      relations: ['organisation'],
    });
    if (foundBranch) {
      return {
        organisationId: foundBranch.organisationId,
        branchId: foundBranch.id,
        groupId: null,
        subOrgId: foundBranch.organisation?.type === 'sub_org' ? foundBranch.organisationId : null,
      };
    }

    // 3. Check Organisations (Apex, Partner, Sub-Org)
    const foundOrg = await this.dataSource.getRepository(Organisation).findOne({
      where: { code },
    });
    if (foundOrg) {
      return {
        organisationId: foundOrg.id,
        branchId: null,
        groupId: null,
        subOrgId: foundOrg.type === 'sub_org' ? foundOrg.id : null,
      };
    }

    return null;
  }

  /**
   * Returns a descriptive name and hierarchy for a unique code.
   */
  async getOrgHierarchy(code: string) {
    const resolved = await this.resolveOrgCode(code);
    if (!resolved) return null;

    // 1. Resolve Group
    if (resolved.groupId) {
      const group = await this.dataSource.getRepository(Group).findOne({
        where: { id: resolved.groupId },
        relations: ['organisation', 'branch'],
      });
      if (group) {
        return {
          name: group.name,
          type: 'Group',
          hierarchy: `${group.branch?.name || 'Main'} > ${group.organisation?.name || 'NOGALSS'}`,
          full: `${group.name} (${group.branch?.name || 'Main'} > ${group.organisation?.name || 'NOGALSS'})`,
        };
      }
    }

    // 2. Resolve Branch
    if (resolved.branchId) {
      const branch = await this.dataSource.getRepository(Branch).findOne({
        where: { id: resolved.branchId },
        relations: ['organisation'],
      });
      if (branch) {
        return {
          name: branch.name,
          type: 'Branch',
          hierarchy: branch.organisation?.name || 'NOGALSS',
          full: `${branch.name} (${branch.organisation?.name || 'NOGALSS'})`,
        };
      }
    }

    // 3. Resolve Organisation
    if (resolved.organisationId) {
      const org = await this.dataSource.getRepository(Organisation).findOne({
        where: { id: resolved.organisationId },
        relations: ['parent'],
      });
      if (org) {
        return {
          name: org.name,
          type: org.type === 'apex' ? 'Apex' : (org.type === 'partner' ? 'Partner' : 'Sub-Org'),
          hierarchy: org.parent?.name || (org.type === 'apex' ? 'National' : 'NOGALSS'),
          full: `${org.name} (${org.parent?.name || 'National'})`,
        };
      }
    }

    return null;
  }
}
